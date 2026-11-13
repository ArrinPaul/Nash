import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMatchStore } from './store/matchStore';
import { useFullscreen } from './hooks/fullscreen';
import { useIdleReturn } from './hooks/idle';
import { tally, matchResult } from './game/match';
import { AttractScreen } from './components/AttractScreen';
import { SetupScreen } from './components/SetupScreen';
import { RoundScreen } from './components/RoundScreen';
import { RevealPanel } from './components/RevealPanel';
import { MatchResultScreen } from './components/MatchResultScreen';
import { ExplainerScreen } from './components/ExplainerScreen';

interface AppProps {
  store?: typeof useMatchStore;
}

export const App: React.FC<AppProps> = ({ store = useMatchStore }) => {
  const {
    screen,
    playerName,
    difficulty,
    round,
    history,
    outcomes,
    lastOutcome,
    setPlayerName,
    goToSetup,
    setDifficulty,
    startMatch,
    submitMove,
    undoRound,
    continue: continueRound,
    showExplainer,
    backFromExplainer,
    rematch,
    returnToAttract,
  } = store();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Kiosk auto-reset: return to attract after inactivity, same baseline as real-or-ai-wall.
  useIdleReturn(screen !== 'attract', () => {
    returnToAttract();
  });

  const { playerWins, aiWins } = tally(outcomes);

  return (
    <main className="w-full h-full min-h-screen bg-ink text-paper font-body flex flex-col items-center justify-center relative">
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="px-3 py-2 bg-panel border border-panel-line text-muted hover:text-paper transition-colors text-xs font-mono uppercase tracking-wider cursor-pointer"
          title="Toggle fullscreen (F)"
        >
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'attract' && <AttractScreen key="attract" onStart={goToSetup} />}

        {screen === 'setup' && (
          <SetupScreen
            key="setup"
            playerName={playerName}
            onNameChange={setPlayerName}
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
          />
        )}

        {screen === 'reveal' && difficulty && lastOutcome && (
          <RevealPanel
            key={`reveal-${lastOutcome.round}`}
            outcome={lastOutcome}
            difficulty={difficulty}
            playerWins={playerWins}
            aiWins={aiWins}
            onUndo={undoRound}
            onContinue={continueRound}
          />
        )}

        {screen === 'result' && difficulty && (
          <MatchResultScreen
            key="result"
            result={matchResult(outcomes)}
            difficulty={difficulty}
            history={history}
            outcomes={outcomes}
            onRematch={rematch}
            onChangeDifficulty={goToSetup}
            onShowExplainer={showExplainer}
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
