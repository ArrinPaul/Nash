import React from 'react';
import { motion } from 'framer-motion';
import type { MatchDifficulty } from '../data/types';
import { ADAPTIVE_FROM_ROUND } from '../game/ai';

interface SetupScreenProps {
  playerName: string;
  onNameChange: (name: string) => void;
  difficulty: MatchDifficulty | null;
  onDifficultyChange: (d: MatchDifficulty) => void;
  onStart: () => void;
}

const DIFFICULTY_COPY: Record<MatchDifficulty, { label: string; detail: string }> = {
  fair: {
    label: 'Fair',
    detail: `Random through round ${ADAPTIVE_FROM_ROUND.fair - 1}, then adapts.`,
  },
  ruthless: {
    label: 'Ruthless',
    detail: `Random round 1 only, adapts from round ${ADAPTIVE_FROM_ROUND.ruthless}.`,
  },
};

export const SetupScreen: React.FC<SetupScreenProps> = ({
  playerName,
  onNameChange,
  difficulty,
  onDifficultyChange,
  onStart,
}) => {
  return (
    <motion.div
      data-testid="setup-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-8 px-6"
    >
      <h2 className="font-display text-3xl text-paper">Best of seven. Choose your fight.</h2>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <label htmlFor="player-name" className="font-mono text-xs uppercase tracking-widest text-muted">
          Name (optional, for the leaderboard)
        </label>
        <input
          id="player-name"
          type="text"
          value={playerName}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={24}
          placeholder="Anonymous"
          className="bg-panel border-2 border-panel-line text-paper px-3 py-2 font-body outline-none focus:border-accent"
        />
      </div>

      <div className="flex gap-4">
        {(Object.keys(DIFFICULTY_COPY) as MatchDifficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`difficulty-${d}`}
            onClick={() => onDifficultyChange(d)}
            className={`px-6 py-4 border-2 font-mono text-sm uppercase tracking-wider transition-colors cursor-pointer ${
              difficulty === d
                ? 'bg-accent border-accent text-paper'
                : 'bg-panel border-panel-line text-muted hover:text-paper'
            }`}
          >
            <div className="text-base font-semibold">{DIFFICULTY_COPY[d].label}</div>
            <div className="text-[11px] opacity-80 mt-1 max-w-[12rem]">{DIFFICULTY_COPY[d].detail}</div>
          </button>
        ))}
      </div>

      <button
        type="button"
        data-testid="begin-match"
        disabled={!difficulty}
        onClick={onStart}
        className="px-8 py-3 bg-accent text-paper font-mono uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-2 border-accent"
      >
        Begin match
      </button>
    </motion.div>
  );
};
