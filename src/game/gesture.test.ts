import { describe, it, expect } from 'vitest';
import { classifyGesture, createGestureDebouncer, type Landmark } from './gesture';

/**
 * Builds a synthetic upright hand. Wrist at the bottom; each finger's pip sits 0.2 above
 * the wrist and its tip is either extended (0.4 above) or curled back toward the palm.
 */
function hand(up: { index: boolean; middle: boolean; ring: boolean; pinky: boolean }): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
  lm[0] = { x: 0.5, y: 0.9 };
  const set = (pip: number, tip: number, x: number, extended: boolean) => {
    lm[pip] = { x, y: 0.7 };
    lm[tip] = { x, y: extended ? 0.3 : 0.78 };
  };
  set(6, 8, 0.42, up.index);
  set(10, 12, 0.5, up.middle);
  set(14, 16, 0.58, up.ring);
  set(18, 20, 0.66, up.pinky);
  return lm;
}

describe('classifyGesture', () => {
  it('reads a closed fist as rock', () => {
    expect(classifyGesture(hand({ index: false, middle: false, ring: false, pinky: false }))).toBe('rock');
  });

  it('reads an open hand as paper', () => {
    expect(classifyGesture(hand({ index: true, middle: true, ring: true, pinky: true }))).toBe('paper');
  });

  it('reads index and middle up as scissors', () => {
    expect(classifyGesture(hand({ index: true, middle: true, ring: false, pinky: false }))).toBe('scissors');
  });

  it('does not call a single raised finger a move', () => {
    expect(classifyGesture(hand({ index: true, middle: false, ring: false, pinky: false }))).toBeNull();
  });

  it('does not call index plus ring a move', () => {
    expect(classifyGesture(hand({ index: true, middle: false, ring: true, pinky: false }))).toBeNull();
  });

  it('returns null for an incomplete landmark set', () => {
    expect(classifyGesture([{ x: 0, y: 0 }])).toBeNull();
  });
});

describe('createGestureDebouncer', () => {
  it('only reports a gesture after it holds for enough frames', () => {
    const d = createGestureDebouncer(3);
    expect(d.push('rock')).toBeNull();
    expect(d.push('rock')).toBeNull();
    expect(d.push('rock')).toBe('rock');
  });

  it('resets when the pose changes or is lost', () => {
    const d = createGestureDebouncer(3);
    d.push('rock');
    d.push('rock');
    expect(d.push('paper')).toBeNull();
    expect(d.push(null)).toBeNull();
    d.push('paper');
    d.push('paper');
    expect(d.push('paper')).toBe('paper');
  });
});
