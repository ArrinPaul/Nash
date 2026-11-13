import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoundOutcome, MatchDifficulty } from '../data/types';
import { moodForOutcome, pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { RPSGlyph } from './RPSGlyph';

interface RevealPanelProps {
  outcome: RoundOutcome;
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

export const RevealPanel: React.FC<RevealPanelProps> = ({
  outcome,
  difficulty,
  playerWins,
  aiWins,
  onUndo,
  onContinue,
}) => {
  const mood = moodForOutcome(outcome.winner, outcome.round, difficulty);
  const [line] = useState(() => pickLine(mood));

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
        <div className="flex flex-col items-center gap-2">
          <RPSGlyph fixed={outcome.playerMove} size={56} className="text-paper" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted">You</span>
        </div>
        <span className="font-display text-2xl text-accent">vs</span>
        <div className="flex flex-col items-center gap-2">
          <RPSGlyph fixed={outcome.aiMove} size={56} className="text-accent" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted">Nash</span>
        </div>
      </div>

      <div data-testid="round-winner" className="font-display text-2xl text-paper">
        {WINNER_TEXT[outcome.winner]}
      </div>

      <div className="font-mono text-xs uppercase tracking-widest text-muted" data-testid="score-line">
        You {playerWins} &ndash; Nash {aiWins}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="undo-round"
          onClick={onUndo}
          className="px-5 py-2 bg-panel border border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
          title="Redo this pick if that wasn't the move you meant to make"
        >
          Redo this pick
        </button>
        <button
          type="button"
          data-testid="continue-round"
          onClick={onContinue}
          className="px-6 py-2 bg-accent text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
};
