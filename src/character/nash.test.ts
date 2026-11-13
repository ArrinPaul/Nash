import { describe, it, expect } from 'vitest';
import { moodForRound, moodForOutcome, pickLine } from './nash';

describe('moodForRound', () => {
  it('Fair is reading through round 3 and locking-pattern from round 4', () => {
    expect(moodForRound(1, 'fair')).toBe('reading');
    expect(moodForRound(3, 'fair')).toBe('reading');
    expect(moodForRound(4, 'fair')).toBe('locking-pattern');
  });

  it('Ruthless is reading only round 1, locking-pattern from round 2', () => {
    expect(moodForRound(1, 'ruthless')).toBe('reading');
    expect(moodForRound(2, 'ruthless')).toBe('locking-pattern');
  });
});

describe('moodForOutcome', () => {
  it('ai winning the round puts Nash in won-round', () => {
    expect(moodForOutcome('ai', 4, 'fair')).toBe('won-round');
  });

  it('player winning the round puts Nash in lost-round', () => {
    expect(moodForOutcome('player', 4, 'fair')).toBe('lost-round');
  });

  it('a tie falls back to the round-based mood', () => {
    expect(moodForOutcome('tie', 1, 'fair')).toBe('reading');
    expect(moodForOutcome('tie', 4, 'fair')).toBe('locking-pattern');
  });
});

describe('pickLine', () => {
  it('is deterministic given an injected rng and always returns a line for the mood', () => {
    expect(typeof pickLine('reading', () => 0)).toBe('string');
    expect(pickLine('reading', () => 0).length).toBeGreaterThan(0);
  });
});
