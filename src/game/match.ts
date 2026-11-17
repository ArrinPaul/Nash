import type { Move, RoundWinner, RoundOutcome, MatchLength, GameMode } from '../data/types';
import { beats } from './ai';

/** Default Best-of-7: first to 4 round wins takes the match; 7 played rounds is the hard cap. */
export const WINS_NEEDED = 4;
export const MAX_ROUNDS = 7;

export function winsNeededForLength(length: MatchLength = 7): number {
  return Math.ceil(length / 2);
}

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

/** True once either side has clinched the match, or the round cap is reached. */
export function isMatchOver(
  outcomes: RoundOutcome[],
  matchLength: MatchLength = 7,
  mode: GameMode = 'vs-ai'
): boolean {
  const { playerWins, aiWins } = tally(outcomes);
  if (mode === 'survival') {
    // In survival mode, game is over when player loses 3 rounds (hearts)
    return aiWins >= 3;
  }
  const needed = winsNeededForLength(matchLength);
  return playerWins >= needed || aiWins >= needed || outcomes.length >= matchLength;
}

export type MatchResult = 'player' | 'ai' | 'draw';

/** Only reaches 'draw' if the round cap is hit before either side clinches 4 — possible
 * only with ties eating into the 7 rounds (e.g. 3-3 with one tie, cap reached). */
export function matchResult(outcomes: RoundOutcome[], mode: GameMode = 'vs-ai'): MatchResult {
  const { playerWins, aiWins } = tally(outcomes);
  if (mode === 'survival') {
    return aiWins >= 3 ? 'ai' : 'player';
  }
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

/** The player's current (trailing) consecutive-win streak as of the end of `outcomes` —
 * same tie-tolerant rule as bestPlayerStreak, but counting backwards from the latest round
 * instead of tracking the longest run overall. Drives the in-round "streak building" pulse:
 * it only needs to know "is the player on a roll right now," not the match's best ever. */
export function currentPlayerStreak(outcomes: RoundOutcome[]): number {
  let streak = 0;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    const winner = outcomes[i].winner;
    if (winner === 'player') streak++;
    else if (winner === 'ai') break;
    // a trailing tie doesn't break the streak — keep walking backwards past it.
  }
  return streak;
}
