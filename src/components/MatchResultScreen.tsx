import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Move, RoundOutcome, MatchDifficulty } from '../data/types';
import type { MatchResult } from '../game/match';
import { buildInsights } from '../game/insights';
import { bestPlayerStreak } from '../game/match';
import { pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { loadLeaderboard, topEntries, todaysEntries } from '../leaderboard/leaderboard';

interface MatchResultScreenProps {
  result: MatchResult;
  difficulty: MatchDifficulty;
  history: Move[];
  outcomes: RoundOutcome[];
  onRematch: () => void;
  onChangeDifficulty: () => void;
  onShowExplainer: () => void;
}

const RESULT_TEXT: Record<MatchResult, string> = {
  player: 'You won the match',
  ai: 'Nash won the match',
  draw: 'The match ended in a draw',
};

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  result,
  difficulty,
  history,
  outcomes,
  onRematch,
  onChangeDifficulty,
  onShowExplainer,
}) => {
  // Computed once from this specific match's real move history — not a templated sentence
  // swapped in by win/loss outcome (PLAN.md risk #1).
  const insights = useMemo(() => buildInsights(history, outcomes), [history, outcomes]);
  const streak = useMemo(() => bestPlayerStreak(outcomes), [outcomes]);
  const [line] = useState(() => pickLine('reviewing'));

  const todaysBest = useMemo(() => topEntries(todaysEntries(loadLeaderboard()), 5), []);

  return (
    <motion.div
      data-testid="result-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 overflow-y-auto"
    >
      <NashAvatar mood="reviewing" size={88} />
      <h2 className="font-display text-3xl text-paper" data-testid="match-result">
        {RESULT_TEXT[result]}
      </h2>
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {difficulty === 'ruthless' ? 'Ruthless' : 'Fair'} &middot; Best streak this match: {streak}
      </p>

      <div className="w-full max-w-md bg-panel border border-panel-line p-5 flex flex-col gap-3">
        <p className="font-body text-paper text-base">{line}</p>
        <ul data-testid="insights-list" className="flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight.id} className="font-body text-sm text-muted leading-relaxed" data-testid={`insight-${insight.id}`}>
              {insight.text}
            </li>
          ))}
        </ul>
      </div>

      {todaysBest.length > 0 && (
        <div className="w-full max-w-md" data-testid="leaderboard">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
            Best win-streak today
          </h3>
          <ol className="flex flex-col gap-1">
            {todaysBest.map((entry, i) => (
              <li key={`${entry.timestamp}-${i}`} className="font-body text-sm text-paper flex justify-between border-b border-panel-line py-1">
                <span>{i + 1}. {entry.name}</span>
                <span className="text-muted">{entry.bestStreak} streak &middot; {entry.difficulty}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          data-testid="rematch"
          onClick={onRematch}
          className="px-6 py-3 bg-accent text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          Rematch
        </button>
        <button
          type="button"
          data-testid="change-difficulty"
          onClick={onChangeDifficulty}
          className="px-6 py-3 bg-panel border border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          Change difficulty
        </button>
        <button
          type="button"
          data-testid="show-explainer"
          onClick={onShowExplainer}
          className="px-6 py-3 bg-panel border border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          How the AI is reading you
        </button>
      </div>
    </motion.div>
  );
};
