import type { Move } from '../data/types';

/** A single hand landmark in MediaPipe's normalised image space. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Landmark indices (MediaPipe Hands, 21 points). Finger = [pip, tip]. */
const WRIST = 0;
const FINGERS = {
  index: [6, 8],
  middle: [10, 12],
  ring: [14, 16],
  pinky: [18, 20],
} as const;

/** A finger counts as extended when its tip is clearly farther from the wrist than its middle joint. */
const EXTENDED_RATIO = 1.12;

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface FingerState {
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export function fingerStates(landmarks: Landmark[]): FingerState | null {
  if (landmarks.length < 21) return null;
  const wrist = landmarks[WRIST];
  const state = {} as FingerState;
  for (const [name, [pip, tip]] of Object.entries(FINGERS) as [keyof FingerState, readonly [number, number]][]) {
    state[name] = dist(landmarks[tip], wrist) > dist(landmarks[pip], wrist) * EXTENDED_RATIO;
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
