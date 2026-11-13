import type { Move, MatchDifficulty } from '../data/types';
import { MOVES } from '../data/types';

/**
 * The AI opponent: a plain frequency/n-gram model, not a trained network — see PLAN.md
 * "Constraints / non-goals". Pure and deterministic given an injected rng, so it can be
 * unit-tested with no camera/UI in the loop (same pattern as real-or-ai-wall's scoring/deck).
 */

/** Round (1-indexed) from which each difficulty starts weighting against the player's
 * detected tendency, instead of picking randomly. Below this round the AI has "not enough
 * data yet" and must say so (Nash's `reading` mood) — never adapt quietly before this. */
export const ADAPTIVE_FROM_ROUND: Record<MatchDifficulty, number> = {
  fair: 4,
  ruthless: 2,
};

/** How many of the player's most recent moves feed the frequency count (plan: "last 5"). */
export const HISTORY_WINDOW = 5;

/**
 * Probability the AI actually plays the counter to its prediction, rather than a random
 * move, once it has a prediction. This is the "open decision" the plan left to the builder
 * (exact weighting strength) — Ruthless commits to its read far more often than Fair, which
 * is what makes the two difficulties mechanically different, not just differently labeled
 * (see PLAN.md risk #3).
 */
export const COUNTER_WEIGHT: Record<MatchDifficulty, number> = {
  fair: 0.65,
  ruthless: 0.9,
};

export function beats(a: Move, b: Move): boolean {
  return (a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock');
}

/** The move that beats `move`. */
export function counterTo(move: Move): Move {
  if (move === 'rock') return 'paper';
  if (move === 'paper') return 'scissors';
  return 'rock';
}

export function randomMove(rng: () => number = Math.random): Move {
  const index = Math.min(MOVES.length - 1, Math.floor(rng() * MOVES.length));
  return MOVES[index];
}

export function isReadingRound(round: number, difficulty: MatchDifficulty): boolean {
  return round < ADAPTIVE_FROM_ROUND[difficulty];
}

/**
 * Predicts the player's next move from their recent history: the most frequent move within
 * the last `windowSize` moves. Ties favor the most recently played of the tied moves (a
 * player's last move is a better recency signal than an older tie). Returns null when there
 * is no history yet (true cold-start, before round 1 has even been played).
 */
export function predictNextMove(history: Move[], windowSize: number = HISTORY_WINDOW): Move | null {
  if (history.length === 0) return null;

  const window = history.slice(-windowSize);
  const counts = new Map<Move, number>();
  for (const move of window) {
    counts.set(move, (counts.get(move) ?? 0) + 1);
  }

  let best: Move | null = null;
  let bestCount = -1;
  // Walk from most recent to oldest so a tie resolves to the more recently played move.
  for (let i = window.length - 1; i >= 0; i--) {
    const move = window[i];
    const count = counts.get(move) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = move;
    }
  }
  return best;
}

export interface AIPick {
  move: Move;
  mode: 'random' | 'adaptive';
  predictedPlayerMove: Move | null;
}

export interface PickAIMoveParams {
  history: Move[];
  round: number;
  difficulty: MatchDifficulty;
  rng?: () => number;
}

/**
 * Chooses the AI's move for this round. Gated strictly on round number (never adapts early,
 * even if history happens to exist) and, once adaptive, only counters its prediction with
 * probability `COUNTER_WEIGHT[difficulty]` — the rest of the time it still plays randomly, so
 * a player who varies their moves can't be perfectly read even late in a match (matches the
 * explainer's "play less predictably" tip actually being true).
 */
export function pickAIMove({ history, round, difficulty, rng = Math.random }: PickAIMoveParams): AIPick {
  if (isReadingRound(round, difficulty)) {
    return { move: randomMove(rng), mode: 'random', predictedPlayerMove: null };
  }

  const predicted = predictNextMove(history);
  if (!predicted) {
    return { move: randomMove(rng), mode: 'random', predictedPlayerMove: null };
  }

  const shouldCounter = rng() < COUNTER_WEIGHT[difficulty];
  const move = shouldCounter ? counterTo(predicted) : randomMove(rng);
  return { move, mode: 'adaptive', predictedPlayerMove: predicted };
}
