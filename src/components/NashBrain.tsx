import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Move, RoundOutcome, MatchDifficulty, MatchLength, AIArchetype } from '../data/types';
import { MOVES } from '../data/types';
import { getPredictionProbabilities, isReadingRound, predictPlayerMove } from '../game/ai';
import { MOVE_LABEL, MOVE_TILE } from './moveTheme';

interface NashBrainProps {
  history: Move[];
  outcomes: RoundOutcome[];
  archetype: AIArchetype;
  round: number;
  difficulty: MatchDifficulty;
  matchLength: MatchLength;
  /** On the reveal, mark what you actually played. */
  actual?: Move;
  /** On the reveal, the move Nash really predicted that round (null = it guessed). */
  predicted?: Move | null;
}

/**
 * Nash's brain, made visible. The bars are the real counts of your last five throws (the
 * same window the model uses); the highlighted move is what Nash's predictor actually
 * expects. During warm-up rounds Nash isn't using any of it yet, and the card says so.
 */
export const NashBrain: React.FC<NashBrainProps> = ({
  history,
  outcomes,
  archetype,
  round,
  difficulty,
  matchLength,
  actual,
  predicted,
}) => {
  const reveal = actual !== undefined;
  const warmingUp = isReadingRound(round, difficulty, matchLength);
  const seen = reveal ? history.slice(0, -1) : history;
  const odds = useMemo(() => getPredictionProbabilities(seen), [seen]);
  const livePrediction = useMemo(
    () => predictPlayerMove({ history: seen, outcomes: reveal ? outcomes.slice(0, -1) : outcomes, archetype }),
    [seen, outcomes, archetype, reveal]
  );
  const expected = reveal ? predicted ?? null : warmingUp ? null : livePrediction;
  const empty = seen.length === 0;

  return (
    <div
      className="rounded-[1.5rem] bg-ink text-bone p-3.5 w-full max-w-[16rem]"
      data-testid="nash-brain"
      aria-label="What Nash expects from you"
    >
      <p className="label !text-bone/70 mb-2">
        {reveal ? 'What Nash saw' : warmingUp ? 'Nash is not using this yet' : 'What Nash expects'}
      </p>
      <div className="flex items-end justify-between gap-3 h-16">
        {MOVES.map((move) => {
          const pct = empty ? 0 : odds[move];
          const isExpected = expected === move;
          return (
            <div key={move} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="num text-xs text-bone/80">{empty ? '–' : `${pct}%`}</span>
              <motion.div
                initial={false}
                animate={{ height: `${Math.max(pct, empty ? 6 : 4)}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                className={`w-full rounded-t-lg min-h-1 ${MOVE_TILE[move].bg} ${
                  warmingUp && !reveal ? 'opacity-30' : isExpected ? '' : 'opacity-55'
                } ${isExpected ? 'ring-2 ring-bone ring-offset-2 ring-offset-ink' : ''}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 mt-2">
        {MOVES.map((move) => (
          <span
            key={move}
            className={`flex-1 text-center text-[11px] font-semibold ${
              actual === move ? 'text-sheet' : 'text-bone/70'
            }`}
          >
            {MOVE_LABEL[move]}
            {actual === move && ' ←you'}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-snug">
        {expected ? (
          <>
            Nash {reveal ? 'expected' : 'is betting on'} <strong>{expected}</strong>
            {reveal && (
              <>
                {' '}
                &mdash; {expected === actual ? <strong className="text-sheet">it read you.</strong> : <strong className="text-sheet">you fooled it.</strong>}
              </>
            )}
          </>
        ) : empty ? (
          'No throws yet. Nash has nothing to go on.'
        ) : (
          'Just guessing this round.'
        )}
      </p>
    </div>
  );
};
