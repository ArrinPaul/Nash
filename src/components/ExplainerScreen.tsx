import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Move, RoundOutcome, MatchDifficulty } from '../data/types';
import { ADAPTIVE_FROM_ROUND } from '../game/ai';
import { NashAvatar } from './NashAvatar';

interface ExplainerScreenProps {
  difficulty: MatchDifficulty;
  history: Move[];
  outcomes: RoundOutcome[];
  onBack: () => void;
}

const MOVE_LABEL: Record<Move, string> = { rock: 'rock', paper: 'paper', scissors: 'scissors' };

/**
 * "How the AI is reading you" — the education angle, using THIS match's real data as the
 * worked example rather than generic copy, per PLAN.md. Honest about what the model is
 * (a frequency/n-gram model) and is not (a trained neural network) — PLAN.md "Constraints".
 */
export const ExplainerScreen: React.FC<ExplainerScreenProps> = ({ difficulty, history, outcomes, onBack }) => {
  const adaptiveRounds = outcomes.filter((o) => o.aiMode === 'adaptive');
  const lastAdaptive = adaptiveRounds[adaptiveRounds.length - 1];
  const threshold = ADAPTIVE_FROM_ROUND[difficulty];

  const workedExample = useMemo(() => {
    if (!lastAdaptive || !lastAdaptive.predictedPlayerMove) return null;
    return {
      predicted: lastAdaptive.predictedPlayerMove,
      actual: lastAdaptive.playerMove,
      aiMove: lastAdaptive.aiMove,
      round: lastAdaptive.round,
      correct: lastAdaptive.predictedPlayerMove === lastAdaptive.playerMove,
    };
  }, [lastAdaptive]);

  return (
    <motion.div
      data-testid="explainer-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen flex flex-col gap-8 px-6 sm:px-12 py-20 max-w-3xl mx-auto"
    >
      <NashAvatar mood="reviewing" size={72} />
      <h2 className="display text-6xl sm:text-7xl">How Nash reads you</h2>

      <div className="flex flex-col gap-8 text-lg text-ink/80 leading-relaxed">
        <section>
          <h3 className="display text-3xl text-ink mb-2">Sequence prediction</h3>
          <p>
            Nash isn't guessing randomly after the warm-up. It keeps your last {history.length > 5 ? 5 : history.length || 5}{' '}
            moves and tracks which one you played most — then plays the move that beats that
            prediction. It's a plain frequency model, not a trained neural network: it only
            ever looks at counts in a short window, nothing deeper.
          </p>
        </section>

        {workedExample && (
          <section data-testid="worked-example" className="bg-sheet text-ink rounded-[1.75rem] p-6">
            <h3 className="display text-3xl text-ink mb-2">
              From your match, round {workedExample.round}
            </h3>
            <p>
              Nash predicted you'd play <strong className="text-ink">{MOVE_LABEL[workedExample.predicted]}</strong>{' '}
              next, so it played <strong className="text-ink">{MOVE_LABEL[workedExample.aiMove]}</strong> to beat
              it. You actually played{' '}
              <strong className="text-ink">{MOVE_LABEL[workedExample.actual]}</strong> — the prediction was{' '}
              {workedExample.correct ? 'right' : 'wrong'} that time.
            </p>
          </section>
        )}

        <section>
          <h3 className="display text-3xl text-ink mb-2">Why it struggles early</h3>
          <p>
            For the first {threshold - 1} round{threshold - 1 === 1 ? '' : 's'} on this difficulty, Nash has no
            history to work from — that's the <strong className="text-ink">cold-start problem</strong>: a
            model can't find a pattern in data that doesn't exist yet. Nash plays those rounds
            randomly and says so, instead of pretending to already understand you.
          </p>
        </section>

        <section>
          <h3 className="display text-3xl text-ink mb-2">How to beat it</h3>
          <p>
            Play less predictably — closer to a genuine 1-in-3 split between rock, paper, and
            scissors, and avoid repeating yourself right after a loss. A frequency model has
            nothing to exploit if there's no frequent move to find. This is a real tip: it
            will actually make Nash's counter-picks worse on your next rematch.
          </p>
        </section>
      </div>

      <button
        type="button"
        data-testid="explainer-back"
        onClick={onBack}
        className="btn btn-solid self-start"
      >
        Back to results
      </button>
    </motion.div>
  );
};
