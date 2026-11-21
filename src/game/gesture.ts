import type { Move } from '../data/types';

/** A single hand landmark in MediaPipe's normalised image space. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Landmark indices (MediaPipe Hands, 21 points). Finger = [mcp, pip, tip]. */
const FINGERS = {
  index: [5, 6, 8],
  middle: [9, 10, 12],
  ring: [13, 14, 16],
  pinky: [17, 18, 20],
} as const;

/** A finger counts as extended when the pip joint is nearly straight (mcp-pip-tip close to
 * a straight line) rather than sharply bent. Measured as an angle, not a wrist-distance
 * ratio, so it stays accurate regardless of how the hand is tilted toward the camera — a
 * distance-based check reads a curled finger as "extended" the moment the fist rotates and
 * the tip swings sideways away from a straight line through the wrist, which was misreading
 * tilted rock gestures as scissors. */
const STRAIGHT_ANGLE_DEG = 150;

function angleAtVertex(a: Landmark, vertex: Landmark, c: Landmark): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export interface FingerState {
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export function fingerStates(landmarks: Landmark[]): FingerState | null {
  if (landmarks.length < 21) return null;
  const state = {} as FingerState;
  for (const [name, [mcp, pip, tip]] of Object.entries(FINGERS) as [keyof FingerState, readonly [number, number, number]][]) {
    state[name] = angleAtVertex(landmarks[mcp], landmarks[pip], landmarks[tip]) > STRAIGHT_ANGLE_DEG;
  }
  return state;
}

/**
 * Maps one hand's landmarks to a move, or null when the pose is ambiguous.
 * - rock: all four fingers curled
 * - scissors: index and middle up, ring and pinky curled
 * - paper: three or four fingers up
 * Anything else (a single finger, a half-open hand) returns null so a stray pose never counts.
 * The thumb is ignored on purpose: it is the least reliable landmark across hand orientations.
 */
export function classifyGesture(landmarks: Landmark[]): Move | null {
  const f = fingerStates(landmarks);
  if (!f) return null;
  const up = [f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;
  if (up === 0) return 'rock';
  if (f.index && f.middle && !f.ring && !f.pinky) return 'scissors';
  if (up >= 3) return 'paper';
  return null;
}

/**
 * Smooths per-frame results: a gesture is only reported once it has been the same for
 * `needed` consecutive frames, and a different pose resets the count.
 */
export function createGestureDebouncer(needed = 6) {
  let candidate: Move | null = null;
  let streak = 0;
  return {
    push(frame: Move | null): Move | null {
      if (frame === candidate) {
        streak++;
      } else {
        candidate = frame;
        streak = 1;
      }
      return candidate !== null && streak >= needed ? candidate : null;
    },
    reset() {
      candidate = null;
      streak = 0;
    },
  };
}
