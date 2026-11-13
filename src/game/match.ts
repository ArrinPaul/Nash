import type { Move, RoundWinner, RoundOutcome } from '../data/types';
import { beats } from './ai';

/** Best-of-7: first to 4 round wins takes the match; 7 played rounds is the hard cap. */
export const WINS_NEEDED = 4;
export const MAX_ROUNDS = 7;

export function resolveRound(playerMove: Move, aiMove: Move): RoundWinner {
  if (playerMove === aiMove) return 'tie';
  return beats(playerMove, aiMove) ? 'player' : 'ai';
}

export interface MatchTally {
  playerWins: number;
  aiWins: number;
}

export function tally(outcomes: RoundOutcome[]): MatchTally {
  let playerWins = 0;
  let aiWins = 0;
  for (const o of outcomes) {
    if (o.winner === 'player') playerWins++;
    else if (o.winner === 'ai') aiWins++;
  }
  return { playerWins, aiWins };
}

/** True once either side has clinched best-of-7, or the round cap is reached. */
export function isMatchOver(outcomes: RoundOutcome[]): boolean {
  const { playerWins, aiWins } = tally(outcomes);
  return playerWins >= WINS_NEEDED || aiWins >= WINS_NEEDED || outcomes.length >= MAX_ROUNDS;
}

export type MatchResult = 'player' | 'ai' | 'draw';

/** Only reaches 'draw' if the round cap is hit before either side clinches 4 — possible
 * only with ties eating into the 7 rounds (e.g. 3-3 with one tie, cap reached). */
export function matchResult(outcomes: RoundOutcome[]): MatchResult {
  const { playerWins, aiWins } = tally(outcomes);
  if (playerWins > aiWins) return 'player';
  if (aiWins > playerWins) return 'ai';
  return 'draw';
}

/** Longest consecutive run of player round-wins across the match (for the post-match
 * summary and the "best win-streak today" leaderboard). */
export function bestPlayerStreak(outcomes: RoundOutcome[]): number {
  let best = 0;
  let current = 0;
  for (const o of outcomes) {
    if (o.winner === 'player') {
      current++;
      best = Math.max(best, current);
    } else if (o.winner === 'ai') {
      current = 0;
    }
    // A tie doesn't break a streak — it's a wash round, not a loss.
  }
  return best;
}
