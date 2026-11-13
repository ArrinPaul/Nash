import type { Move, RoundOutcome } from '../data/types';
import { MOVES } from '../data/types';

/**
 * Turns a match's real move history into the post-match "here's what I noticed about your
 * play" summary. This is the same kind of frequency analysis that drives the AI's own
 * predictions (see game/ai.ts) — run once more for exposition, not a templated sentence
 * swapped in by win/loss outcome (PLAN.md risk #1). Every finding here must be computed
 * from the actual `outcomes` passed in, and must degrade honestly ("not enough data") rather
 * than inventing a pattern when the sample is too small to mean anything.
 */

export interface Insight {
  id: string;
  text: string;
}

const MIN_ROUNDS_FOR_PATTERN = 3;

function movePercent(history: Move[], move: Move): number {
  if (history.length === 0) return 0;
  const count = history.filter((m) => m === move).length;
  return Math.round((count / history.length) * 100);
}

function mostFrequentMove(history: Move[]): { move: Move; percent: number } | null {
  if (history.length === 0) return null;
  let best: Move = MOVES[0];
  let bestPercent = -1;
  for (const move of MOVES) {
    const percent = movePercent(history, move);
    if (percent > bestPercent) {
      bestPercent = percent;
      best = move;
    }
  }
  return { move: best, percent: bestPercent };
}

/** Among rounds that followed a loss, the player's most frequent response move — e.g.
 * "You played rock 60% of the time right after losing a round." Needs at least 2 qualifying
 * rounds to say anything, otherwise it would be reading tea leaves from one data point. */
function moveAfterLoss(outcomes: RoundOutcome[]): { move: Move; percent: number; sampleSize: number } | null {
  const responses: Move[] = [];
  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i - 1].winner === 'ai') {
      responses.push(outcomes[i].playerMove);
    }
  }
  if (responses.length < 2) return null;
  const best = mostFrequentMove(responses);
  if (!best) return null;
  return { move: best.move, percent: best.percent, sampleSize: responses.length };
}

/** How often the player repeated their previous move, vs switching — a distinct tell from
 * raw move frequency (a player can be 50/50 rock-paper but still very "sticky" round to
 * round). */
function repeatRate(history: Move[]): number | null {
  if (history.length < 2) return null;
  let repeats = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i] === history[i - 1]) repeats++;
  }
  return Math.round((repeats / (history.length - 1)) * 100);
}

const MOVE_LABEL: Record<Move, string> = { rock: 'rock', paper: 'paper', scissors: 'scissors' };

/**
 * Builds the list of findings for the match. `history` is the player's moves in order
 * (same shape the AI's predictor consumes); `outcomes` is the full round-by-round record.
 * Always returns at least one insight — falling back to an honest "not enough rounds"
 * message rather than ever inventing a pattern from too little data.
 */
export function buildInsights(history: Move[], outcomes: RoundOutcome[]): Insight[] {
  const insights: Insight[] = [];

  if (history.length < MIN_ROUNDS_FOR_PATTERN) {
    return [{ id: 'too-short', text: "That match was too short for a real pattern to show up — rematch for a longer read." }];
  }

  const frequent = mostFrequentMove(history);
  if (frequent && frequent.percent >= 40) {
    insights.push({
      id: 'frequent-move',
      text: `You played ${MOVE_LABEL[frequent.move]} ${frequent.percent}% of the time overall.`,
    });
  }

  const afterLoss = moveAfterLoss(outcomes);
  if (afterLoss && afterLoss.percent >= 50) {
    insights.push({
      id: 'after-loss',
      text: `You played ${MOVE_LABEL[afterLoss.move]} ${afterLoss.percent}% of the time right after losing a round.`,
    });
  }

  const repeat = repeatRate(history);
  if (repeat !== null) {
    if (repeat >= 50) {
      insights.push({ id: 'repeat-high', text: `You stuck with your previous move ${repeat}% of the time instead of switching.` });
    } else if (repeat <= 15) {
      insights.push({ id: 'repeat-low', text: `You almost never repeated your last move (${repeat}% of the time) — that's close to unpredictable.` });
    }
  }

  if (insights.length === 0) {
    insights.push({ id: 'no-clear-pattern', text: "Your picks were close to even across rock, paper, and scissors — no single tendency stood out." });
  }

  return insights;
}
