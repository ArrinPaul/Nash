import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Move, RoundOutcome, MatchDifficulty, GameMode } from '../data/types';
import type { MatchResult } from '../game/match';
import { buildInsights } from '../game/insights';
import { bestPlayerStreak, tally } from '../game/match';
import { pickLine } from '../character/nash';
import { NashAvatar } from './NashAvatar';
import { HistoryStrip } from './HistoryStrip';
import { MOVE_TILE, MOVE_LABEL } from './moveTheme';
import { loadLeaderboard, topEntries, todaysEntries } from '../leaderboard/leaderboard';
import { playMatchVictorySound } from '../audio/sound';

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
  mode?: GameMode;
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
  mode = 'vs-ai',
}) => {
  // Computed once from this specific match's real move history — not a templated sentence
  // swapped in by win/loss outcome (PLAN.md risk #1).
  const insights = useMemo(() => buildInsights(history, outcomes), [history, outcomes]);
  const streak = useMemo(() => bestPlayerStreak(outcomes), [outcomes]);
  const [line] = useState(() => pickLine('reviewing'));

  // Real numbers from this match: your throw mix, and how often Nash's read was right.
  const throwMix = useMemo(() => {
    const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
    for (const m of history) counts[m]++;
    return counts;
  }, [history]);
  const reads = useMemo(() => {
    const adaptive = outcomes.filter((o) => o.aiMode === 'adaptive' && o.predictedPlayerMove);
    return { total: adaptive.length, hits: adaptive.filter((o) => o.predictedPlayerMove === o.playerMove).length };
  }, [outcomes]);

  const todaysBest = useMemo(() => topEntries(todaysEntries(loadLeaderboard()), 5), []);
  const { playerWins, aiWins } = tally(outcomes);

  useEffect(() => {
    if (result === 'player' || isNewBestStreak) {
      playMatchVictorySound();
      try {
        confetti({
          particleCount: isNewBestStreak ? 120 : 60,
          spread: 70,
          origin: { y: 0.65 },
        });
      } catch {
        // Safe fallback in test or headless envs
      }
    }
  }, [result, isNewBestStreak]);

  // Keyboard shortcut listener: Space/Enter = Rematch, D = Difficulty
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onRematch();
      } else if (e.key.toLowerCase() === 'd') {
        onChangeDifficulty();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRematch, onChangeDifficulty]);

  return (
    <>
    <motion.div
      data-testid="result-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full min-h-screen grid lg:grid-cols-[1.1fr_1fr] gap-x-16 gap-y-10 px-6 sm:px-12 lg:px-20 py-20 max-w-7xl mx-auto print:hidden"
    >
      <div className="flex flex-col gap-6 lg:justify-center">
        <motion.div
          initial={isNewBestStreak ? { scale: 0.4, opacity: 0 } : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: isNewBestStreak ? 260 : 300, damping: isNewBestStreak ? 12 : 22 }}
          className="flex items-center gap-4"
        >
          <NashAvatar mood="reviewing" size={isNewBestStreak ? 88 : 72} />
          {isNewBestStreak && (
            <motion.div
              data-testid="new-best-streak"
              initial={{ scale: 0.5, opacity: 0, y: -8 }}
              animate={{ scale: [0.5, 1.12, 1], opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="rounded-full bg-sheet text-ink font-semibold px-4 py-1.5"
            >
              New best streak today &mdash; {streak}
            </motion.div>
          )}
        </motion.div>

        <h2 className="display text-6xl sm:text-8xl" data-testid="match-result">
          {mode === 'survival' ? `Survival Complete — Survived ${outcomes.length} Rounds!` : RESULT_TEXT[result]}
        </h2>

        <div className="flex items-end gap-6">
          <div>
            <div className="label">You</div>
            <div className="display text-8xl">{playerWins}</div>
          </div>
          <div className="display text-5xl text-mute pb-3">:</div>
          <div>
            <div className="label">Nash</div>
            <div className="display text-8xl">{aiWins}</div>
          </div>
          <div className="pb-3 ml-4 text-ink/80">
            <div>{difficulty === 'ruthless' ? 'Ruthless' : 'Fair'} difficulty</div>
            <div>
              Best streak <strong>{streak}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" data-testid="rematch" onClick={onRematch} className="btn btn-solid text-lg min-h-16 px-10">
            Rematch <span className="kbd">Space</span>
          </button>
          <button type="button" data-testid="change-difficulty" onClick={onChangeDifficulty} className="btn">
            Options <span className="kbd">D</span>
          </button>
          <button type="button" data-testid="show-explainer" onClick={onShowExplainer} className="btn">
            How it works
          </button>
          <button
            type="button"
            data-testid="print-takeaway"
            onClick={() => window.print()}
            className="btn"
            title="Print a one-page summary to take home"
          >
            Print
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:justify-center">
        <section data-testid="throw-breakdown">
          <h3 className="label mb-3">How Nash read you</h3>
          <HistoryStrip outcomes={outcomes} />
          <div className="flex flex-col gap-2 mt-3">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => {
              const pct = history.length ? Math.round((throwMix[move] / history.length) * 100) : 0;
              return (
                <div key={move} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-semibold">{MOVE_LABEL[move]}</span>
                  <div className="flex-1 h-4 rounded-full bg-ink/10 overflow-hidden">
                    <div className={`h-full rounded-full ${MOVE_TILE[move].bg}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="num text-sm w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-lg">
            {reads.total === 0
              ? 'Nash was still guessing the whole match.'
              : `Nash read you correctly ${reads.hits} of ${reads.total} times it tried.`}
          </p>
        </section>

        <section>
          <h3 className="label mb-2">What gave you away</h3>
          <p className="display-i text-2xl mb-4">&ldquo;{line}&rdquo;</p>
          <ul data-testid="insights-list" className="flex flex-col divide-y-2 divide-ink border-y-2 border-ink">
            {insights.map((insight) => (
              <li key={insight.id} className="py-3 text-lg leading-snug" data-testid={`insight-${insight.id}`}>
                {insight.text}
              </li>
            ))}
          </ul>
        </section>

        {todaysBest.length > 0 && (
          <section data-testid="leaderboard">
            <h3 className="label mb-2">Best win-streaks today</h3>
            <ol className="flex flex-col">
              {todaysBest.map((entry, i) => (
                <li key={`${entry.timestamp}-${i}`} className="flex items-baseline gap-4 py-1.5 border-b border-ink/20">
                  <span className="display text-2xl w-8">{i + 1}</span>
                  <span className="flex-1 font-semibold truncate">{entry.name}</span>
                  <span className="num text-sm text-mute">
                    {entry.bestStreak} streak &middot; {entry.difficulty}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
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
