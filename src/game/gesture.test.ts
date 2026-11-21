import { describe, it, expect } from 'vitest';
import { classifyGesture, createGestureDebouncer, type Landmark } from './gesture';

/**
 * Builds a synthetic upright hand. Wrist at the bottom; each finger's mcp/pip sit in a
 * straight line above the wrist, and the tip either continues that line (extended) or
 * folds back toward the mcp (curled), matching real finger-joint geometry.
 */
function hand(up: { index: boolean; middle: boolean; ring: boolean; pinky: boolean }): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
  lm[0] = { x: 0.5, y: 0.9 };
  const set = (mcp: number, pip: number, tip: number, x: number, extended: boolean) => {
    lm[mcp] = { x, y: 0.78 };
    lm[pip] = { x, y: 0.7 };
    lm[tip] = { x, y: extended ? 0.3 : 0.76 };
  };
  set(5, 6, 8, 0.42, up.index);
  set(9, 10, 12, 0.5, up.middle);
  set(13, 14, 16, 0.58, up.ring);
  set(17, 18, 20, 0.66, up.pinky);
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

  it('still reads a tilted fist as rock when a curled fingertip swings away from the wrist', () => {
    // Regression test: a fist held at an angle (not perfectly upright) bends its index
    // finger sharply at the pip joint, but the tip swings sideways far enough that its
    // straight-line distance to the wrist exceeds the pip's — the old wrist-distance-ratio
    // check misread this as "extended" (and the whole hand as scissors/paper), even though
    // the joint itself is clearly curled.
    const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
    lm[0] = { x: 0.5, y: 1.0 }; // wrist
    lm[5] = { x: 0.46, y: 0.9 }; // index mcp
    lm[6] = { x: 0.48, y: 0.75 }; // index pip, pulled toward the palm
    lm[8] = { x: 0.3, y: 0.78 }; // index tip, curled but swung sideways
    // middle/ring/pinky plainly curled, straight above the wrist
    lm[9] = { x: 0.5, y: 0.78 };
    lm[10] = { x: 0.5, y: 0.7 };
    lm[12] = { x: 0.5, y: 0.76 };
    lm[13] = { x: 0.58, y: 0.78 };
    lm[14] = { x: 0.58, y: 0.7 };
    lm[16] = { x: 0.58, y: 0.76 };
    lm[17] = { x: 0.66, y: 0.78 };
    lm[18] = { x: 0.66, y: 0.7 };
    lm[20] = { x: 0.66, y: 0.76 };

    expect(classifyGesture(lm)).toBe('rock');
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
