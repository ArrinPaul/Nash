import React, { useRef, useEffect, useState } from 'react';
import type { Move } from '../data/types';
import { classifyGesture, createGestureDebouncer } from '../game/gesture';
import { getHandTracker, type HandTracker } from '../camera/handTracker';
import { ACTIVITY_EVENT } from '../hooks/idle';
import { MOVE_LABEL } from './moveTheme';

interface WebcamGestureInputProps {
  /** True once SHOOT is up and nothing has been thrown yet: only then does a held pose count. */
  armed: boolean;
  /** Called once with the gesture that was held long enough. */
  onThrow: (move: Move) => void;
  onClose: () => void;
}

type Tracking = 'permission' | 'loading' | 'tracking' | 'manual';

/** How long a pose must be held, after it is first recognised, before it is thrown. */
export const HOLD_MS = 450;

/**
 * Camera mode: a small live panel in the corner. The hand is read continuously; once SHOOT
 * is up and the same pose has been held for HOLD_MS it is thrown automatically. No button.
 */
export const WebcamGestureInput: React.FC<WebcamGestureInputProps> = ({ armed, onThrow, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const armedRef = useRef(armed);
  const onThrowRef = useRef(onThrow);
  const [tracking, setTracking] = useState<Tracking>('permission');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [live, setLive] = useState<Move | null>(null);
  const [lockPct, setLockPct] = useState(0);

  useEffect(() => {
    armedRef.current = armed;
    onThrowRef.current = onThrow;
  }, [armed, onThrow]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let tracker: HandTracker | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera not supported in this browser.');
        setTracking('manual');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      } catch (err) {
        console.warn('Webcam access error:', err);
        if (!cancelled) {
          setCameraError('Camera unavailable or permission denied.');
          setTracking('manual');
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      try {
        setTracking('loading');
        tracker = await getHandTracker();
        if (cancelled) return;
        setTracking('tracking');

        const debouncer = createGestureDebouncer(5);
        let lastTime = -1;
        let held: Move | null = null;
        let heldSince = 0;
        let fired = false;
        let wasArmed = false;
        let lastPct = 0;

        const loop = () => {
          const video = videoRef.current;
          if (tracker && video && video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const hand = tracker.detectForVideo(video, performance.now()).landmarks[0];
            const stable = debouncer.push(hand ? classifyGesture(hand) : null);

            if (stable !== held) {
              held = stable;
              heldSince = performance.now();
              setLive(stable);
              // A visible hand means someone is playing: keep the kiosk from idling out.
              if (stable) window.dispatchEvent(new Event(ACTIVITY_EVENT));
            }

            // Each new SHOOT window starts fresh: the pose must be held after it opens.
            if (armedRef.current && !wasArmed) {
              fired = false;
              heldSince = performance.now();
            }
            wasArmed = armedRef.current;

            // Auto-capture: armed + same pose held long enough => throw it, exactly once.
            let pct = 0;
            if (held && armedRef.current && !fired) {
              pct = Math.min(1, (performance.now() - heldSince) / HOLD_MS);
              if (pct >= 1) {
                fired = true;
                onThrowRef.current(held);
              }
            }
            const rounded = Math.round(pct * 20) / 20;
            if (rounded !== lastPct) {
              lastPct = rounded;
              setLockPct(rounded);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.warn('Hand tracking unavailable, using manual selection:', err);
        if (!cancelled) setTracking('manual');
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const status =
    tracking === 'permission'
      ? 'Allow the camera to start'
      : tracking === 'loading'
        ? 'Loading hand tracking…'
        : tracking === 'manual'
          ? 'Camera off — use the tiles or R P S'
          : !armed
            ? live
              ? `${MOVE_LABEL[live]} — wait for Shoot!`
              : 'Get your hand ready'
            : live
              ? `Locking ${MOVE_LABEL[live].toLowerCase()}…`
              : 'Show your hand now';

  return (
    <aside
      className="fixed z-40 bottom-3 right-4 w-56 sm:w-64 rounded-[1.5rem] bg-ink text-bone p-2 shadow-[0_10px_30px_rgba(21,18,14,0.35)]"
      aria-label="Camera mode"
      data-testid="camera-panel"
    >
      <div className="relative aspect-[4/3] rounded-[1.1rem] overflow-hidden bg-black">
        {cameraError ? (
          <p className="absolute inset-0 grid place-items-center p-3 text-center text-sm">{cameraError}</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
        )}
        {armed && tracking === 'tracking' && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-bone/20" aria-hidden="true">
            <div className="h-full bg-sheet" style={{ width: `${lockPct * 100}%` }} />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Switch to manual play"
          className="absolute top-2 right-2 rounded-full bg-bone text-ink text-xs font-semibold px-2.5 py-1 cursor-pointer"
        >
          Switch to manual
        </button>
      </div>

      <p
        data-testid="gesture-status"
        aria-live="polite"
        className={`mt-2 mb-1 px-2 text-sm font-semibold ${armed && live ? 'text-sheet' : ''}`}
      >
        {status}
      </p>

    </aside>
  );
};
