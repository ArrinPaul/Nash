import { describe, it, expect } from 'vitest';
import {
  beats,
  counterTo,
  randomMove,
  isReadingRound,
  predictNextMove,
  pickAIMove,
  ADAPTIVE_FROM_ROUND,
  COUNTER_WEIGHT,
} from './ai';

describe('beats / counterTo', () => {
  it('rock beats scissors, scissors beats paper, paper beats rock', () => {
    expect(beats('rock', 'scissors')).toBe(true);
    expect(beats('scissors', 'paper')).toBe(true);
    expect(beats('paper', 'rock')).toBe(true);
  });

  it('is not symmetric and a move never beats itself', () => {
    expect(beats('scissors', 'rock')).toBe(false);
    expect(beats('rock', 'rock')).toBe(false);
  });

  it('counterTo returns the move that beats the given move', () => {
    expect(counterTo('rock')).toBe('paper');
    expect(counterTo('paper')).toBe('scissors');
    expect(counterTo('scissors')).toBe('rock');
    for (const m of ['rock', 'paper', 'scissors'] as const) {
      expect(beats(counterTo(m), m)).toBe(true);
    }
  });
});

describe('randomMove', () => {
  it('is deterministic given an injected rng', () => {
    expect(randomMove(() => 0)).toBe('rock');
    expect(randomMove(() => 0.34)).toBe('paper');
    expect(randomMove(() => 0.99)).toBe('scissors');
  });
});

describe('isReadingRound / ADAPTIVE_FROM_ROUND', () => {
  it('Fair stays in reading mode through round 3 and adapts from round 4', () => {
    expect(ADAPTIVE_FROM_ROUND.fair).toBe(4);
    expect(isReadingRound(1, 'fair')).toBe(true);
    expect(isReadingRound(3, 'fair')).toBe(true);
    expect(isReadingRound(4, 'fair')).toBe(false);
  });

  it('Ruthless adapts from round 2', () => {
    expect(ADAPTIVE_FROM_ROUND.ruthless).toBe(2);
    expect(isReadingRound(1, 'ruthless')).toBe(true);
    expect(isReadingRound(2, 'ruthless')).toBe(false);
  });

  it('Fair and Ruthless use different counter-weights, not just different labels', () => {
    expect(COUNTER_WEIGHT.fair).not.toBe(COUNTER_WEIGHT.ruthless);
    expect(COUNTER_WEIGHT.ruthless).toBeGreaterThan(COUNTER_WEIGHT.fair);
  });
});

describe('predictNextMove', () => {
  it('returns null with no history (true cold start)', () => {
    expect(predictNextMove([])).toBeNull();
  });

  it('predicts the most frequent move in the window', () => {
    expect(predictNextMove(['rock', 'rock', 'paper'])).toBe('rock');
  });

  it('only looks at the last windowSize moves, not the full history', () => {
    const history = ['rock', 'rock', 'rock', 'rock', 'paper', 'paper', 'paper', 'paper'];
    expect(predictNextMove(history, 4)).toBe('paper');
  });

  it('breaks ties in favor of the more recently played move', () => {
    // rock and scissors both appear twice; scissors was played more recently.
    expect(predictNextMove(['rock', 'rock', 'scissors', 'scissors'])).toBe('scissors');
  });
});

describe('pickAIMove', () => {
  it('never adapts before the difficulty threshold, even with a clear history pattern', () => {
    const history = ['rock', 'rock', 'rock', 'rock', 'rock'];
    const pick = pickAIMove({ history, round: 3, difficulty: 'fair', rng: () => 0 });
    expect(pick.mode).toBe('random');
    expect(pick.predictedPlayerMove).toBeNull();
  });

  it('adapts from the threshold round onward when history exists', () => {
    const history = ['rock', 'rock', 'rock', 'rock', 'rock'];
    // rng() < COUNTER_WEIGHT.fair (0.65) so it commits to the counter-pick.
    const pick = pickAIMove({ history, round: 4, difficulty: 'fair', rng: () => 0.1 });
    expect(pick.mode).toBe('adaptive');
    expect(pick.predictedPlayerMove).toBe('rock');
    expect(pick.move).toBe('paper'); // counters rock
  });

  it('still plays randomly sometimes once adaptive, per the counter-weight', () => {
    const history = ['rock', 'rock', 'rock', 'rock', 'rock'];
    // rng() >= COUNTER_WEIGHT.fair (0.65) -> falls through to the random branch,
    // which also calls randomMove(rng): floor(0.9 * 3) = 2 -> 'scissors'.
    const pick = pickAIMove({ history, round: 4, difficulty: 'fair', rng: () => 0.9 });
    expect(pick.mode).toBe('adaptive');
    expect(pick.predictedPlayerMove).toBe('rock');
    expect(pick.move).toBe('scissors');
  });

  it('falls back to random with an empty history even past the adaptive threshold', () => {
    const pick = pickAIMove({ history: [], round: 5, difficulty: 'ruthless', rng: () => 0 });
    expect(pick.mode).toBe('random');
    expect(pick.predictedPlayerMove).toBeNull();
  });

  it('Ruthless adapts one round earlier than Fair with the same history', () => {
    const history = ['paper', 'paper', 'paper'];
    const fair = pickAIMove({ history, round: 2, difficulty: 'fair', rng: () => 0.1 });
    const ruthless = pickAIMove({ history, round: 2, difficulty: 'ruthless', rng: () => 0.1 });
    expect(fair.mode).toBe('random');
    expect(ruthless.mode).toBe('adaptive');
  });
});
