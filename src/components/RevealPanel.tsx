import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { RoundOutcome, MatchDifficulty, MatchLength, AIArchetype, Move } from '../data/types';
import { moodForOutcome, pickLine } from '../character/nash';
import { currentPlayerStreak, winsNeededForLength } from '../game/match';
import { NashAvatar } from './NashAvatar';
import { glyphFor } from './RPSGlyph';
import { ScoreHeader } from './ScoreHeader';
import { HistoryStrip } from './HistoryStrip';
import { NashBrain } from './NashBrain';
import { MOVE_TILE, MOVE_LABEL, tileStyle } from './moveTheme';
import {
  playClashSound,
  playRoundWinSound,
  playRoundLoseSound,
  playRoundTieSound,
  playStreakSound,
} from '../audio/sound';

interface RevealPanelProps {
  outcome: RoundOutcome;
  outcomes: RoundOutcome[];
  difficulty: MatchDifficulty;
  playerWins: number;
  aiWins: number;
  onContinue: () => void;
  matchLength?: MatchLength;
  survival?: boolean;
  history?: Move[];
  archetype?: AIArchetype;
}

const WINNER_TEXT: Record<RoundOutcome['winner'], string> = {
  player: 'You win the round',
  ai: 'Nash wins the round',
  tie: 'Tie round',
};

/** Jagged cracks drawn over Nash's tile when you beat it. */
const Cracks: React.FC = () => (
  <motion.svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    className="absolute inset-0 w-full h-full pointer-events-none"
    aria-hidden="true"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.25, duration: 0.12 }}
  >
    <motion.path
      d="M62 0 L55 22 L66 34 L50 52 L60 66 L46 100 M50 52 L28 60 L20 78 M66 34 L88 42 L100 36"
      fill="none"
      stroke="#efe9dc"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
    />
  </motion.svg>
);

/** The reveal moves on by itself; Space, Enter or the button skips the wait. */
export const AUTO_CONTINUE_MS = 2500;

export const RevealPanel: React.FC<RevealPanelProps> = ({
  outcome,
  outcomes,
  difficulty,
  playerWins,
  aiWins,
  onContinue,
  matchLength = 7,
  survival = false,
  history,
  archetype = 'nash',
}) => {
  const mood = moodForOutcome(outcome.winner, outcome.round, difficulty, matchLength);
  const [line] = useState(() => pickLine(mood));
  const streak = useMemo(() => currentPlayerStreak(outcomes), [outcomes]);
  const showStreakPulse = outcome.winner === 'player' && streak >= 2;
  const playerWon = outcome.winner === 'player';
  const aiWon = outcome.winner === 'ai';
  const playerHistory = history ?? outcomes.map((o) => o.playerMove);

  useEffect(() => {
    playClashSound();
    if (outcome.winner === 'player') {
      if (streak >= 2) playStreakSound();
      else playRoundWinSound();
    } else if (outcome.winner === 'ai') {
      playRoundLoseSound();
    } else {
      playRoundTieSound();
    }
    // Haptics on phones: a sharp double tap for a win, one heavy buzz for a loss.
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(outcome.winner === 'player' ? [30, 40, 30] : outcome.winner === 'ai' ? 120 : 15);
      }
    } catch {
      // Vibration is a nicety; never let it break the reveal.
    }
  }, [outcome.winner, streak]);

  useEffect(() => {
    const id = setTimeout(onContinue, AUTO_CONTINUE_MS);
    return () => clearTimeout(id);
  }, [onContinue]);

  // Keyboard: Space / Enter = continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  return (
    <motion.div
      data-testid="reveal-root"
      initial={{ opacity: 0 }}
      animate={aiWon ? { opacity: 1, x: [0, -14, 12, -8, 5, 0] } : { opacity: 1 }}
      transition={aiWon ? { duration: 0.4, delay: 0.18 } : undefined}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen flex flex-col gap-2 pt-12 pb-3 px-5 sm:px-10 max-w-5xl mx-auto select-none"
    >
      <ScoreHeader
        round={outcome.round}
        playerWins={playerWins}
        aiWins={aiWins}
        target={winsNeededForLength(matchLength)}
        survival={survival}
        streak={streak}
      />

      <HistoryStrip outcomes={outcomes} />

      {/* The clash: both tiles slam in from outside the frame. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 h-[clamp(7rem,20vh,15rem)] shrink-0 grid-rows-1">
        <motion.div
          initial={{ x: -120, scale: 1.35, opacity: 0, rotate: -6 }}
          animate={{ x: 0, scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className={`${MOVE_TILE[outcome.playerMove].bg} ${MOVE_TILE[outcome.playerMove].fg} rounded-[1.75rem] flex flex-col items-center justify-between p-5 ${
            aiWon ? 'opacity-45' : ''
          }`}
          style={tileStyle(outcome.playerMove)}
        >
          <span className="label !text-current opacity-70 self-start">You</span>
          <svg viewBox="0 0 100 100" className="h-[46%] w-auto aspect-square" data-testid="rps-glyph" data-move={outcome.playerMove}>
            {glyphFor(outcome.playerMove)}
          </svg>
          <span className="display text-3xl">{MOVE_LABEL[outcome.playerMove]}</span>
        </motion.div>

        <motion.div
          initial={{ x: 120, scale: 1.35, opacity: 0, rotate: 6 }}
          animate={{ x: 0, scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.06 }}
          className={`relative overflow-hidden bg-ink text-bone rounded-[1.75rem] flex flex-col items-center justify-between p-5 ${
            playerWon ? 'opacity-70' : ''
          }`}
          style={{ ['--glyph-detail' as string]: '#15120e' }}
        >
          <span className="label !text-bone opacity-70 self-start">Nash</span>
          <svg viewBox="0 0 100 100" className="h-[46%] w-auto aspect-square text-sheet" data-testid="rps-glyph" data-move={outcome.aiMove}>
            {glyphFor(outcome.aiMove)}
          </svg>
          <span className="display text-3xl">{MOVE_LABEL[outcome.aiMove]}</span>
          {playerWon && <Cracks />}
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <motion.h2
          data-testid="round-winner"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.12 }}
          className={`display text-3xl sm:text-4xl ${playerWon ? 'text-win' : aiWon ? 'text-ink' : 'text-mute'}`}
        >
          {WINNER_TEXT[outcome.winner]}
        </motion.h2>

        {showStreakPulse && (
          <motion.div
            data-testid="streak-pulse"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-full bg-sheet text-ink font-semibold px-4 py-1"
          >
            {streak} in a row
          </motion.div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
        <div className="flex items-center gap-4">
          <NashAvatar mood={mood} size={56} />
          <p className="display-i text-2xl sm:text-3xl text-left max-w-xs" data-testid="nash-line">
            {line}
          </p>
        </div>
        <NashBrain
          history={playerHistory}
          outcomes={outcomes}
          archetype={archetype}
          round={outcome.round}
          difficulty={difficulty}
          matchLength={matchLength}
          actual={outcome.playerMove}
          predicted={outcome.aiMode === 'adaptive' ? outcome.predictedPlayerMove : null}
        />
      </div>

      <div className="mt-auto flex justify-center">
        <button
          type="button"
          data-testid="continue-round"
          onClick={onContinue}
          className="btn btn-solid text-lg min-h-14 px-12 relative overflow-hidden"
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-bone/20"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: AUTO_CONTINUE_MS / 1000, ease: 'linear' }}
          />
          <span className="relative">
            Next round <span className="kbd">Space</span>
          </span>
        </button>
      </div>
    </motion.div>
  );
};
