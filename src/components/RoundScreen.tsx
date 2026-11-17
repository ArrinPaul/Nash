import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Move, MatchDifficulty, RoundOutcome, GameMode, MatchLength, AIArchetype } from '../data/types';
import { moodForRound, pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { RPSGlyph, glyphFor } from './RPSGlyph';
import { ScoreHeader } from './ScoreHeader';
import { HistoryStrip } from './HistoryStrip';
import { NashBrain } from './NashBrain';
import { MOVE_TILE, MOVE_LABEL, tileStyle } from './moveTheme';
import { currentPlayerStreak, tally, winsNeededForLength } from '../game/match';
import { randomMove } from '../game/ai';
import { MindReaderGauge } from './MindReaderGauge';
import { preloadHandTracker } from '../camera/handTracker';
import { useCameraStore } from '../camera/cameraStore';
import { playRockSound, playPaperSound, playScissorsSound, playNashVoice, playSelectSound } from '../audio/sound';

interface RoundScreenProps {
  round: number;
  difficulty: MatchDifficulty;
  outcomes: RoundOutcome[];
  onSubmitMove: (move: Move) => void;
  history?: Move[];
  mode?: GameMode;
  matchLength?: MatchLength;
  archetype?: AIArchetype;
}

const MOVE_KEY: Record<Move, string> = { rock: 'R', paper: 'P', scissors: 'S' };
const THINKING_MS = 280;
/** The "Rock, Paper, Scissors, SHOOT" count-in: one word per beat. */
const BEAT_MS = 330;
const BEATS = ['Rock', 'Paper', 'Scissors', 'Shoot!'];
/** How long you have after SHOOT before the shot clock throws a random move for you. */
export const SHOT_CLOCK_MS = 3500;

export const RoundScreen: React.FC<RoundScreenProps> = ({
  round,
  difficulty,
  outcomes,
  onSubmitMove,
  history,
  mode = 'vs-ai',
  matchLength = 7,
  archetype = 'nash',
}) => {
  const [thinking, setThinking] = useState(false);
  const [picked, setPicked] = useState<Move | null>(null);
  const [beat, setBeat] = useState(0); // 0..3 = counting in, 4 = shoot window open
  const [tooSlow, setTooSlow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [line] = useState(() => pickLine(moodForRound(round, difficulty, matchLength)));

  const playerHistory = history || outcomes.map((o) => o.playerMove);

  // Warm up hand tracking so the camera opens ready instead of loading for seconds.
  useEffect(() => {
    preloadHandTracker();
  }, []);

  useEffect(() => {
    playNashVoice();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [round, difficulty]);

  // Count-in: lights up one word per beat, then the shot clock opens.
  useEffect(() => {
    if (thinking) return;
    if (beat >= BEATS.length) return;
    const id = setTimeout(() => {
      setBeat((b) => b + 1);
      playSelectSound();
    }, BEAT_MS);
    return () => clearTimeout(id);
  }, [beat, thinking]);

  const handlePick = (move: Move, late = false) => {
    if (thinking) return;
    if (move === 'rock') playRockSound();
    else if (move === 'paper') playPaperSound();
    else if (move === 'scissors') playScissorsSound();

    setTooSlow(late);
    setPicked(move);
    setThinking(true);
    timeoutRef.current = setTimeout(() => {
      onSubmitMove(move);
    }, THINKING_MS);
  };

  // Camera mode is app-level and always live alongside the tiles and keys: this round only
  // registers its throw handler and says when SHOOT is open.
  const handlePickRef = useRef(handlePick);
  handlePickRef.current = handlePick;
  const camEnabled = useCameraStore((c) => c.enabled);
  const setCamEnabled = useCameraStore((c) => c.setEnabled);
  const setCamArmed = useCameraStore((c) => c.setArmed);
  const registerThrow = useCameraStore((c) => c.register);
  useEffect(() => {
    registerThrow((move) => handlePickRef.current(move));
    return () => {
      registerThrow(null);
      setCamArmed(false);
    };
  }, [registerThrow, setCamArmed]);
  useEffect(() => {
    setCamArmed(beat >= BEATS.length && !thinking);
  }, [beat, thinking, setCamArmed]);

  // Shot clock: once SHOOT is up, a pick must land in time or a random move is thrown for you.
  useEffect(() => {
    if (thinking || beat < BEATS.length) return;
    const id = setTimeout(() => handlePick(randomMove(), true), SHOT_CLOCK_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, thinking]);

  // Keyboard: R/1, P/2, S/3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (thinking) return;
      const key = e.key.toLowerCase();
      if (key === 'r' || key === '1') handlePick('rock');
      else if (key === 'p' || key === '2') handlePick('paper');
      else if (key === 's' || key === '3') handlePick('scissors');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking]);

  const { playerWins, aiWins } = tally(outcomes);
  const mood = moodForRound(round, difficulty, matchLength);
  const target = winsNeededForLength(matchLength);
  const shooting = beat >= BEATS.length;

  return (
    <motion.div
      data-testid="round-root"
      data-round={round}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen flex flex-col gap-2 pt-12 pb-3 px-5 sm:px-10 max-w-5xl mx-auto select-none"
    >
      <ScoreHeader
        round={round}
        playerWins={playerWins}
        aiWins={aiWins}
        target={target}
        survival={mode === 'survival'}
        streak={currentPlayerStreak(outcomes)}
      />

      <HistoryStrip outcomes={outcomes} />

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
        <div className="flex items-center gap-5 text-left">
          <NashAvatar mood={mood} size={72} />
          <div className="flex flex-col gap-3 items-start">
            <p className="display-i text-3xl sm:text-4xl max-w-md" data-testid="nash-line">
              {line}
            </p>
            <MindReaderGauge
              round={round}
              difficulty={difficulty}
              history={playerHistory}
              mode="live-scanner"
              matchLength={matchLength}
            />
          </div>
        </div>
        <NashBrain
          history={playerHistory}
          outcomes={outcomes}
          archetype={archetype}
          round={round}
          difficulty={difficulty}
          matchLength={matchLength}
        />
      </div>

      {/* Count-in + shot clock */}
      <div className="flex flex-col items-center gap-2" data-testid="count-in" aria-live="polite">
        <div className="flex items-baseline gap-3 sm:gap-5 h-9">
          {BEATS.map((word, i) => (
            <span
              key={word}
              className={`display text-2xl sm:text-3xl transition-all duration-100 ${
                i === BEATS.length - 1 && beat > i ? 'text-rock scale-125' : i < beat ? 'text-ink' : 'text-ink/15'
              }`}
            >
              {word}
            </span>
          ))}
        </div>
        <div className="h-1.5 w-full max-w-md rounded-full bg-ink/10 overflow-hidden" aria-hidden="true">
          {shooting && !thinking && (
            <motion.div
              key={`clock-${round}`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: SHOT_CLOCK_MS / 1000, ease: 'linear' }}
              className="h-full bg-rock rounded-full"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {thinking && picked ? (
          <div className="flex flex-col gap-3" data-testid="thinking-indicator">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 h-[clamp(6.5rem,18vh,14rem)] shrink-0 grid-rows-1">
              {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
                <div
                  key={move}
                  className={`rounded-[1.75rem] grid place-items-center ${
                    move === picked ? `${MOVE_TILE[move].bg} ${MOVE_TILE[move].fg}` : 'bg-bone-deep text-ink/20'
                  }`}
                  style={move === picked ? tileStyle(move) : undefined}
                >
                  <svg viewBox="0 0 100 100" className={move === picked ? "h-1/2 w-auto aspect-square" : "h-1/3 w-auto aspect-square"}>
                    {glyphFor(move)}
                  </svg>
                </div>
              ))}
            </div>
            <p className="flex items-center justify-center gap-3 font-semibold">
              <RPSGlyph size={22} className="text-ink" />
              {tooSlow ? 'Too slow — a random move was thrown for you…' : 'Nash is choosing…'}
            </p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-3 gap-3 sm:gap-4 h-[clamp(6.5rem,18vh,14rem)] shrink-0 grid-rows-1"
              data-testid="move-buttons"
            >
              {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
                <motion.button
                  key={move}
                  type="button"
                  data-testid={`move-${move}`}
                  onClick={() => handlePick(move)}
                  whileHover={{ y: -6, rotate: move === 'paper' ? 1 : -1 }}
                  whileTap={{ scale: 0.95, y: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className={`${MOVE_TILE[move].bg} ${MOVE_TILE[move].fg} rounded-[1.75rem] flex flex-col items-center justify-between p-4 sm:p-5 cursor-pointer`}
                  style={tileStyle(move)}
                >
                  <span className="kbd self-end">{MOVE_KEY[move]}</span>
                  <svg viewBox="0 0 100 100" className="h-1/2 w-auto aspect-square min-h-12">
                    {glyphFor(move)}
                  </svg>
                  <span className="display text-2xl sm:text-3xl">{MOVE_LABEL[move]}</span>
                </motion.button>
              ))}
            </div>
            <button
              type="button"
              data-testid="camera-toggle"
              aria-pressed={camEnabled}
              onClick={() => setCamEnabled(!camEnabled)}
              className="self-center text-sm font-semibold text-mute hover:text-ink underline underline-offset-4 cursor-pointer"
            >
              {camEnabled ? 'Hand or tiles — both work. Turn camera off' : 'Turn camera on to play with your hand'}
            </button>
          </>
        )}
      </div>

    </motion.div>
  );
};
