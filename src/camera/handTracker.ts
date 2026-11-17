/**
 * Shared, lazily created MediaPipe hand tracker. The model and wasm are vendored in
 * /public/mediapipe, so this works offline. The first load is heavy (a ~14 MB wasm build
 * plus a ~8 MB model), so `preloadHandTracker()` lets the round screen warm it up before
 * anyone opens the camera.
 */
export interface HandTracker {
  detectForVideo: (video: HTMLVideoElement, timeMs: number) => { landmarks: { x: number; y: number }[][] };
}

const BASE = import.meta.env.BASE_URL ?? '/';
const WASM_DIR = `${BASE}mediapipe/wasm`;
const MODEL_PATH = `${BASE}mediapipe/hand_landmarker.task`;

let pending: Promise<HandTracker> | null = null;

export function getHandTracker(): Promise<HandTracker> {
  if (!pending) {
    pending = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_DIR);
      const make = (delegate: 'GPU' | 'CPU') =>
        vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      return (await make('GPU').catch(() => make('CPU'))) as HandTracker;
    })();
    // A failed load must be retryable next time the camera opens.
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

/** Fire-and-forget warm-up; never throws and never blocks the UI. */
export function preloadHandTracker(): void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  const run = () => {
    getHandTracker().catch(() => {});
  };
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(run);
  else setTimeout(run, 1500);
}

const PREF_KEY = 'nash-camera-mode';

/** Camera mode defaults to on and stays on from round to round. */
export function getCameraPreference(): boolean {
  try {
    // On unless the player turned it off this session.
    return sessionStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setCameraPreference(on: boolean): void {
  try {
    sessionStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    // Storage can be blocked; camera mode then simply resets each round.
  }
}
