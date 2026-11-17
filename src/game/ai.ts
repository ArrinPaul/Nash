import type { Move, MatchDifficulty, AIArchetype, RoundOutcome } from '../data/types';
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

export function isReadingRound(round: number, difficulty: MatchDifficulty, matchLength: number = 7): boolean {
  if (matchLength <= 3) {
    return round < 2;
  }
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
  matchLength?: number;
  archetype?: AIArchetype;
  outcomes?: RoundOutcome[];
  rng?: () => number;
}

/**
 * Calculates percentage likelihood for each move given history.
 * Used for the post-round "Mind Reader" analysis telemetry.
 */
export function getPredictionProbabilities(history: Move[], windowSize: number = HISTORY_WINDOW): Record<Move, number> {
  if (history.length === 0) {
    return { rock: 33, paper: 33, scissors: 34 };
  }

  const window = history.slice(-windowSize);
  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const move of window) {
    counts[move]++;
  }

  const total = window.length;
  const rockPct = Math.round((counts.rock / total) * 100);
  const paperPct = Math.round((counts.paper / total) * 100);
  const scissorsPct = Math.max(0, 100 - (rockPct + paperPct));

  return { rock: rockPct, paper: paperPct, scissors: scissorsPct };
}

/**
 * 1st-Order Markov Transition Model:
 * Evaluates what the player tends to play after their most recent move.
 * Counteracts rotational / shifting players who cycle through moves.
 */
export function predictMarkovTransition(history: Move[]): Move | null {
  if (history.length < 2) return null;
  const lastMove = history[history.length - 1];

  const transitionCounts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  let totalTransitions = 0;

  for (let i = 0; i < history.length - 1; i++) {
    if (history[i] === lastMove) {
      const next = history[i + 1];
      transitionCounts[next]++;
      totalTransitions++;
    }
  }

  if (totalTransitions === 0) return null;

  let bestFollower: Move = 'rock';
  let maxCount = -1;
  for (const m of MOVES) {
    if (transitionCounts[m] > maxCount) {
      maxCount = transitionCounts[m];
      bestFollower = m;
    }
  }

  return maxCount > 0 ? bestFollower : null;
}

/**
 * Cycle and sequence detector:
 * Identifies clockwise (R->P->S), counter-clockwise (R->S->P), and alternating (A-B-A) sequences.
 */
export function predictCycle(history: Move[]): Move | null {
  if (history.length < 3) return null;
  const len = history.length;
  const m1 = history[len - 3];
  const m2 = history[len - 2];
  const m3 = history[len - 1];

  // Clockwise cycle: rock -> paper -> scissors -> rock
  const isClockwise =
    (m1 === 'rock' && m2 === 'paper' && m3 === 'scissors') ||
    (m1 === 'paper' && m2 === 'scissors' && m3 === 'rock') ||
    (m1 === 'scissors' && m2 === 'rock' && m3 === 'paper');

  if (isClockwise) {
    return counterTo(m3);
  }

  // Counter-clockwise cycle: rock -> scissors -> paper -> rock
  const isCounterClockwise =
    (m1 === 'rock' && m2 === 'scissors' && m3 === 'paper') ||
    (m1 === 'scissors' && m2 === 'paper' && m3 === 'rock') ||
    (m1 === 'paper' && m2 === 'rock' && m3 === 'scissors');

  if (isCounterClockwise) {
    if (m3 === 'rock') return 'scissors';
    if (m3 === 'scissors') return 'paper';
    if (m3 === 'paper') return 'rock';
  }

  // 2-move oscillation: A -> B -> A -> B
  if (m1 === m3 && m1 !== m2) {
    return m2;
  }

  return null;
}

/**
 * Behavioral Game Theory (Win-Stay / Lose-Shift) predictor:
 * - If the player WON the prior round, humans tend to repeat that move (Win-Stay).
 * - If the player LOST, humans tend to shift to the move that would beat what beat them (Lose-Shift).
 */
export function predictWSLS(outcomes: RoundOutcome[]): Move | null {
  if (!outcomes || outcomes.length === 0) return null;
  const last = outcomes[outcomes.length - 1];

  if (last.winner === 'player') {
    // Win-Stay: Player repeats their winning move
    return last.playerMove;
  } else if (last.winner === 'ai') {
    // Lose-Shift: Player shifts to the move that beats the AI's winning move
    return counterTo(last.aiMove);
  }
  // Tie: default to player's last move
  return last.playerMove;
}

/**
 * Unified multi-strategy predictor:
 * 1. WSLS (if psychologist archetype)
 * 2. Cycle & sequence detection (clockwise, counter-clockwise, oscillation)
 * 3. 1st-order Markov transition (move-to-move transition matrix)
 * 4. Frequency count over recent window
 */
export function predictPlayerMove({
  history,
  outcomes = [],
  archetype = 'nash',
}: {
  history: Move[];
  outcomes?: RoundOutcome[];
  archetype?: AIArchetype;
}): Move | null {
  if (history.length === 0) return null;

  // Structural tells beat psychology: a clear cycle, or one move dominating the recent
  // window, is stronger evidence than a win-stay/lose-shift habit.
  const cycle = predictCycle(history);
  if (cycle) return cycle;

  if (archetype === 'psychologist' && outcomes.length > 0) {
    const recent = history.slice(-HISTORY_WINDOW);
    const dominant = predictNextMove(history);
    const dominantCount = recent.filter((m) => m === dominant).length;
    if (recent.length >= 3 && dominant && dominantCount / recent.length >= 0.8) return dominant;
    const wsls = predictWSLS(outcomes);
    if (wsls) return wsls;
  }

  // Check Markov transitions (what moves follow the player's last pick)
  const markov = predictMarkovTransition(history);
  if (markov) return markov;

  // Fallback to frequency count
  return predictNextMove(history);
}

/**
 * Chooses the AI's move for this round. Gated strictly on round number (never adapts early,
 * even if history happens to exist) and, once adaptive, only counters its prediction with
 * probability `COUNTER_WEIGHT[difficulty]` — the rest of the time it still plays randomly.
 */
export function pickAIMove({
  history,
  round,
  difficulty,
  matchLength = 7,
  archetype = 'nash',
  outcomes = [],
  rng = Math.random,
}: PickAIMoveParams): AIPick {
  if (isReadingRound(round, difficulty, matchLength)) {
    return { move: randomMove(rng), mode: 'random', predictedPlayerMove: null };
  }

  const predicted = predictPlayerMove({ history, outcomes, archetype });

  if (!predicted) {
    return { move: randomMove(rng), mode: 'random', predictedPlayerMove: null };
  }

  const weight = COUNTER_WEIGHT[difficulty];
  const shouldCounter = rng() < weight;
  const move = shouldCounter ? counterTo(predicted) : randomMove(rng);
  return { move, mode: 'adaptive', predictedPlayerMove: predicted };
}
