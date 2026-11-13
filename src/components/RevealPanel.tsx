import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { TargetAndTransition, Transition } from 'framer-motion';
import type { RoundOutcome, MatchDifficulty } from '../data/types';
import { moodForOutcome, pickLine } from '../character/nash';
import { currentPlayerStreak } from '../game/match';
import { NashAvatar } from './NashAvatar';
import { RPSGlyph } from './RPSGlyph';

interface RevealPanelProps {
  outcome: RoundOutcome;
  outcomes: RoundOutcome[];
  difficulty: MatchDifficulty;
  playerWins: number;
  aiWins: number;
  onUndo: () => void;
  onContinue: () => void;
}

const WINNER_TEXT: Record<RoundOutcome['winner'], string> = {
  player: 'You win the round',
  ai: 'Nash wins the round',
  tie: 'Tie round',
};

/** The round-result "beat": distinct motion for a player win vs an AI win, so the two feel
 * different in the body, not just in label — a quick upward pop reads as a win, a sharp
 * shake reads as a loss. A tie gets neither; it's a wash, not an event. */
const WINNER_BEAT: Record<RoundOutcome['winner'], { animate: TargetAndTransition; transition: Transition }> = {
  player: { animate: { scale: [0.6, 1.12, 1], y: [14, -4, 0] }, transition: { duration: 0.45, ease: 'easeOut' } },
  ai: { animate: { x: [0, -9, 8, -6, 4, 0], scale: [0.9, 1, 1] }, transition: { duration: 0.4, ease: 'easeOut' } },
  tie: { animate: { opacity: [0, 1], scale: [0.95, 1] }, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const RevealPanel: React.FC<RevealPanelProps> = ({
  outcome,
  outcomes,
  difficulty,
  playerWins,
  aiWins,
  onUndo,
  onContinue,
}) => {
  const mood = moodForOutcome(outcome.winner, outcome.round, difficulty);
  const [line] = useState(() => pickLine(mood));
  const beat = WINNER_BEAT[outcome.winner];
  // Player's trailing win streak as of right now — drives the "building a streak" pulse.
  // Only worth calling out from 2 wins in a row; a single win isn't a streak yet.
  const streak = useMemo(() => currentPlayerStreak(outcomes), [outcomes]);
  const showStreakPulse = outcome.winner === 'player' && streak >= 2;

  return (
    <motion.div
      data-testid="reveal-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-6 px-6"
    >
      <NashAvatar mood={mood} size={88} />
      <p className="font-body text-paper text-lg text-center max-w-sm" data-testid="nash-line">
        {line}
      </p>

      <div className="flex items-center gap-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="flex flex-col items-center gap-2"
        >
          <RPSGlyph fixed={outcome.playerMove} size={56} className="text-paper" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted">You</span>
        </motion.div>
        <span className="font-display text-2xl text-accent">vs</span>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.09 }}
          className="flex flex-col items-center gap-2"
        >
          <RPSGlyph fixed={outcome.aiMove} size={56} className="text-accent" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted">Nash</span>
        </motion.div>
      </div>

      <motion.div
        data-testid="round-winner"
        initial={false}
        animate={beat.animate}
        transition={beat.transition}
        className="font-display text-2xl text-paper"
      >
        {WINNER_TEXT[outcome.winner]}
      </motion.div>

      <div className="flex items-center gap-3">
        <div className="font-mono text-xs uppercase tracking-widest text-muted" data-testid="score-line">
          You {playerWins} &ndash; Nash {aiWins}
        </div>
        {showStreakPulse && (
          <motion.div
            data-testid="streak-pulse"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="font-mono text-xs uppercase tracking-widest text-accent border-2 border-accent-dim px-2 py-0.5"
          >
            {streak} in a row
          </motion.div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="undo-round"
          onClick={onUndo}
          className="px-5 py-2 bg-panel border-2 border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
          title="Redo this pick if that wasn't the move you meant to make"
        >
          Redo this pick
        </button>
        <button
          type="button"
          data-testid="continue-round"
          onClick={onContinue}
          className="px-6 py-2 bg-accent text-paper font-mono text-xs uppercase tracking-widest cursor-pointer border-2 border-accent"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
};
