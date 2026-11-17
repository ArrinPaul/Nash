import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMatchStore } from './store/matchStore';
import { useFullscreen } from './hooks/fullscreen';
import { useIdleReturn } from './hooks/idle';
import { tally, matchResult, winsNeededForLength } from './game/match';
import { AttractScreen } from './components/AttractScreen';
import { SetupScreen } from './components/SetupScreen';
import { RoundScreen } from './components/RoundScreen';
import { RevealPanel } from './components/RevealPanel';
import { MatchResultScreen } from './components/MatchResultScreen';
import { ExplainerScreen } from './components/ExplainerScreen';
import { MultiplayerRoundScreen } from './components/MultiplayerRoundScreen';
import { isSoundEnabled, toggleSound, playMatchVictorySound } from './audio/sound';
import confetti from 'canvas-confetti';

interface AppProps {
  store?: typeof useMatchStore;
}

export const App: React.FC<AppProps> = ({ store = useMatchStore }) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const {
    screen,
    playerName,
    player2Name,
    mode,
    matchLength,
    archetype,
    difficulty,
    round,
    history,
    outcomes,
    lastOutcome,
    p1Score,
    p2Score,
    isNewBestStreak,
    setPlayerName,
    setPlayer2Name,
    setGameMode,
    setMatchLength,
    setArchetype,
    goToSetup,
    setDifficulty,
    startMatch,
    submitMove,
    recordMultiplayerRound,
    continue: continueRound,
    showExplainer,
    backFromExplainer,
    rematch,
    returnToAttract,
  } = store();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // F = fullscreen, M = mute (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f') toggleFullscreen();
      else if (k === 'm') setSoundOn(toggleSound());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  // Kiosk auto-reset: return to attract after inactivity, same baseline as real-or-ai-wall.
  useIdleReturn(screen !== 'attract', () => {
    returnToAttract();
  });

  const { playerWins, aiWins } = tally(outcomes);

  return (
    <main className="w-full min-h-screen bg-bone text-ink font-body relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = toggleSound();
            setSoundOn(next);
          }}
          className="btn !min-h-10 !px-4 text-sm"
          title="Toggle procedural sound effects"
        >
          {soundOn ? 'Sound on' : 'Sound off'} <span className="kbd">M</span>
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="btn !min-h-10 !px-4 text-sm"
          title="Toggle fullscreen (F)"
        >
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} <span className="kbd">F</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'attract' && <AttractScreen key="attract" onStart={goToSetup} />}

        {screen === 'setup' && (
          <SetupScreen
            key="setup"
            playerName={playerName}
            onNameChange={setPlayerName}
            player2Name={player2Name}
            onPlayer2NameChange={setPlayer2Name}
            mode={mode}
            onModeChange={setGameMode}
            matchLength={matchLength}
            onMatchLengthChange={setMatchLength}
            archetype={archetype}
            onArchetypeChange={setArchetype}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onStart={startMatch}
          />
        )}

        {screen === 'round' && difficulty && (
          <RoundScreen
            key={`round-${round}`}
            round={round}
            difficulty={difficulty}
            outcomes={outcomes}
            onSubmitMove={submitMove}
            history={history}
            mode={mode}
            matchLength={matchLength}
            archetype={archetype}
          />
        )}

        {screen === 'reveal' && difficulty && lastOutcome && (
          <RevealPanel
            key={`reveal-${lastOutcome.round}`}
            outcome={lastOutcome}
            outcomes={outcomes}
            difficulty={difficulty}
            playerWins={playerWins}
            aiWins={aiWins}
            onContinue={continueRound}
            matchLength={matchLength}
            survival={mode === 'survival'}
            history={history}
            archetype={archetype}
          />
        )}

        {screen === 'multiplayer' && (
          <MultiplayerRoundScreen
            key={`multiplayer-${round}`}
            round={round}
            p1Name={playerName}
            p2Name={player2Name}
            p1Score={p1Score}
            p2Score={p2Score}
            targetWins={winsNeededForLength(matchLength)}
            onRoundComplete={recordMultiplayerRound}
            onExit={goToSetup}
          />
        )}

        {screen === 'multiplayer-result' && (
          <motion.div
            key="multiplayer-result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center"
            onAnimationComplete={() => {
              playMatchVictorySound();
              try {
                confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
              } catch {
                // Safe in tests
              }
            }}
          >
            <p className="label">Final score</p>
            <h2 className="display text-6xl sm:text-8xl max-w-4xl">
              {p1Score > p2Score
                ? `${playerName || 'Player 1'} wins`
                : p2Score > p1Score
                  ? `${player2Name || 'Player 2'} wins`
                  : 'A draw'}
            </h2>
            <div className="flex items-end gap-8">
              <div>
                <div className="label">{playerName || 'Player 1'}</div>
                <div className="display text-8xl">{p1Score}</div>
              </div>
              <div className="display text-5xl text-mute pb-3">:</div>
              <div>
                <div className="label">{player2Name || 'Player 2'}</div>
                <div className="display text-8xl">{p2Score}</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={startMatch} className="btn btn-solid text-lg min-h-16 px-10">
                Rematch
              </button>
              <button type="button" onClick={goToSetup} className="btn">
                Change players or mode
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'result' && difficulty && (
          <MatchResultScreen
            key="result"
            result={matchResult(outcomes, mode)}
            difficulty={difficulty}
            history={history}
            outcomes={outcomes}
            isNewBestStreak={isNewBestStreak}
            onRematch={rematch}
            onChangeDifficulty={goToSetup}
            onShowExplainer={showExplainer}
            mode={mode}
          />
        )}

        {screen === 'explainer' && difficulty && (
          <ExplainerScreen
            key="explainer"
            difficulty={difficulty}
            history={history}
            outcomes={outcomes}
            onBack={backFromExplainer}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default App;
