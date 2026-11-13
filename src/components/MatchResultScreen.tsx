import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Move, RoundOutcome, MatchDifficulty } from '../data/types';
import type { MatchResult } from '../game/match';
import { buildInsights } from '../game/insights';
import { bestPlayerStreak, tally } from '../game/match';
import { pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { loadLeaderboard, topEntries, todaysEntries } from '../leaderboard/leaderboard';

interface MatchResultScreenProps {
  result: MatchResult;
  difficulty: MatchDifficulty;
  history: Move[];
  outcomes: RoundOutcome[];
  /** True only when this match's best streak genuinely beat every streak already on
   * today's leaderboard — earns a bigger beat than an ordinary match win. */
  isNewBestStreak: boolean;
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
  isNewBestStreak,
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
  const { playerWins, aiWins } = tally(outcomes);

  return (
    <>
    <motion.div
      data-testid="result-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 overflow-y-auto print:hidden"
    >
      {/* A new best-of-the-day streak gets a visibly bigger entrance than an ordinary match
          win — same Nash avatar, same accent palette, just a stronger spring and a wider
          overshoot, so it reads as a bigger moment without reaching for confetti. */}
      <motion.div
        initial={isNewBestStreak ? { scale: 0.4, opacity: 0 } : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          isNewBestStreak
            ? { type: 'spring', stiffness: 260, damping: 12 }
            : { type: 'spring', stiffness: 300, damping: 22 }
        }
      >
        <NashAvatar mood="reviewing" size={isNewBestStreak ? 104 : 88} />
      </motion.div>

      {isNewBestStreak && (
        <motion.div
          data-testid="new-best-streak"
          initial={{ scale: 0.5, opacity: 0, y: -8 }}
          animate={{ scale: [0.5, 1.12, 1], opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="font-mono text-xs uppercase tracking-widest text-ink bg-accent px-4 py-1.5 border border-accent"
        >
          New best streak today &mdash; {streak}
        </motion.div>
      )}

      <h2 className="font-display text-3xl text-paper" data-testid="match-result">
        {RESULT_TEXT[result]}
      </h2>
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {difficulty === 'ruthless' ? 'Ruthless' : 'Fair'} &middot; Best streak this match: {streak}
      </p>

      <div className="hud-panel w-full max-w-md p-5 pt-6 flex flex-col gap-3">
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
          className="px-6 py-3 bg-accent text-paper font-mono text-xs uppercase tracking-widest cursor-pointer border-2 border-accent"
        >
          Rematch
        </button>
        <button
          type="button"
          data-testid="change-difficulty"
          onClick={onChangeDifficulty}
          className="px-6 py-3 bg-panel border-2 border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          Change difficulty
        </button>
        <button
          type="button"
          data-testid="show-explainer"
          onClick={onShowExplainer}
          className="px-6 py-3 bg-panel border-2 border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
        >
          How the AI is reading you
        </button>
        <button
          type="button"
          data-testid="print-takeaway"
          onClick={() => window.print()}
          className="px-6 py-3 bg-panel border-2 border-panel-line text-muted hover:text-paper font-mono text-xs uppercase tracking-widest cursor-pointer"
          title="Print a one-page summary for a parent or student to take home"
        >
          Print takeaway
        </button>
      </div>
    </motion.div>

    {/* Printable takeaway (PLAN.md's parent-at-a-glance need, made tangible): a plain
        light-on-white one-pager with the real match numbers and the real insight text —
        hidden on screen, the only thing that renders when the page is printed. No
        network or QR code involved; it's pure @media print CSS (see src/index.css). */}
    <div className="hidden print:block text-black bg-white p-8 font-sans" data-testid="printable-takeaway">
      <h1 className="text-2xl font-bold mb-1">Nash — Rock Paper Scissors vs AI</h1>
      <p className="text-sm text-gray-600 mb-4">{new Date().toLocaleDateString()} &middot; {difficulty === 'ruthless' ? 'Ruthless' : 'Fair'} difficulty</p>

      <h2 className="text-lg font-semibold mt-4 mb-1">Final score</h2>
      <p>{RESULT_TEXT[result]} &mdash; You {playerWins}, Nash {aiWins}. Best streak this match: {streak}.</p>

      <h2 className="text-lg font-semibold mt-4 mb-1">What I noticed about your play</h2>
      <ul className="list-disc list-inside">
        {insights.map((insight) => (
          <li key={insight.id}>{insight.text}</li>
        ))}
      </ul>

      <h2 className="text-lg font-semibold mt-4 mb-1">How the AI works</h2>
      <p className="mb-2">
        <strong>Sequence prediction:</strong> Nash tracks your last 5 moves and plays the move
        that beats whichever one you played most, instead of guessing at random.
      </p>
      <p className="mb-2">
        <strong>Cold-start problem:</strong> early on, Nash has no history to work from, so it
        can&apos;t find a pattern in data that doesn&apos;t exist yet &mdash; it plays randomly
        and says so, rather than pretending to already understand you.
      </p>
      <p>
        <strong>How to beat it:</strong> play less predictably, closer to a genuine 1-in-3
        split between rock, paper, and scissors. A frequency model has nothing to exploit if
        there&apos;s no frequent move to find.
      </p>
    </div>
    </>
  );
};
