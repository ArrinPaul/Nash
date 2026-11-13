import { describe, it, expect } from 'vitest';
import { resolveRound, tally, isMatchOver, matchResult, bestPlayerStreak, WINS_NEEDED, MAX_ROUNDS } from './match';
import type { RoundOutcome } from '../data/types';

function outcome(winner: RoundOutcome['winner']): RoundOutcome {
  return { round: 1, playerMove: 'rock', aiMove: 'scissors', winner, aiMode: 'random', predictedPlayerMove: null };
}

describe('resolveRound', () => {
  it('a tie on identical moves', () => {
    expect(resolveRound('rock', 'rock')).toBe('tie');
  });
  it('player wins when their move beats the AI move', () => {
    expect(resolveRound('rock', 'scissors')).toBe('player');
  });
  it('ai wins when its move beats the player move', () => {
    expect(resolveRound('scissors', 'rock')).toBe('ai');
  });
});

describe('tally / isMatchOver / matchResult', () => {
  it('counts wins per side, ignoring ties', () => {
    const outcomes = [outcome('player'), outcome('tie'), outcome('ai')];
    expect(tally(outcomes)).toEqual({ playerWins: 1, aiWins: 1 });
  });

  it('is not over before either side reaches WINS_NEEDED and before MAX_ROUNDS', () => {
    const outcomes = [outcome('player'), outcome('ai')];
    expect(isMatchOver(outcomes)).toBe(false);
  });

  it('is over once a side clinches WINS_NEEDED round wins', () => {
    const outcomes = Array.from({ length: WINS_NEEDED }, () => outcome('player'));
    expect(isMatchOver(outcomes)).toBe(true);
    expect(matchResult(outcomes)).toBe('player');
  });

  it('is over once MAX_ROUNDS is reached even without a clinch', () => {
    const outcomes = [
      outcome('player'),
      outcome('player'),
      outcome('player'),
      outcome('ai'),
      outcome('ai'),
      outcome('ai'),
      outcome('tie'),
    ];
    expect(outcomes.length).toBe(MAX_ROUNDS);
    expect(isMatchOver(outcomes)).toBe(true);
    expect(matchResult(outcomes)).toBe('draw');
  });
});

describe('bestPlayerStreak', () => {
  it('is 0 with no player wins', () => {
    expect(bestPlayerStreak([outcome('ai'), outcome('tie')])).toBe(0);
  });

  it('finds the longest consecutive run, broken only by an ai win', () => {
    const outcomes = [
      outcome('player'),
      outcome('player'),
      outcome('ai'),
      outcome('player'),
      outcome('player'),
      outcome('player'),
    ];
    expect(bestPlayerStreak(outcomes)).toBe(3);
  });

  it('a tie does not break a streak', () => {
    const outcomes = [outcome('player'), outcome('tie'), outcome('player')];
    expect(bestPlayerStreak(outcomes)).toBe(2);
  });
});
