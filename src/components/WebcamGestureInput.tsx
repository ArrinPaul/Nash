import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Move } from '../data/types';
import { playSelectSound } from '../audio/sound';
import { classifyGesture, createGestureDebouncer } from '../game/gesture';
import { getHandTracker, type HandTracker } from '../camera/handTracker';
import { MOVE_LABEL } from './moveTheme';

interface WebcamGestureInputProps {
  onGestureDetected: (move: Move) => void;
  onClose: () => void;
}

type Tracking = 'permission' | 'loading' | 'tracking' | 'manual';

const COUNT_STEP_MS = 550;

export const WebcamGestureInput: React.FC<WebcamGestureInputProps> = ({ onGestureDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** The move that will be thrown on SHOOT: the held gesture, or a manual pick. */
  const chosenRef = useRef<Move>('rock');
  const lastStableRef = useRef<Move | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Tracking>('permission');
  const [live, setLive] = useState<Move | null>(null);
  const [chosen, setChosen] = useState<Move>('rock');

  const choose = useCallback((move: Move) => {
    chosenRef.current = move;
    setChosen(move);
  }, []);

  // Camera + on-device hand tracking. Everything is local: the model and wasm ship in /public.
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

        const debouncer = createGestureDebouncer(6);
        let lastTime = -1;
        const loop = () => {
          const video = videoRef.current;
          if (tracker && video && video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const hand = tracker.detectForVideo(video, performance.now()).landmarks[0];
            const stable = debouncer.push(hand ? classifyGesture(hand) : null);
            // Only react when the held pose changes, so a manual tap sticks until you change pose.
            if (stable !== lastStableRef.current) {
              lastStableRef.current = stable;
              setLive(stable);
              if (stable) choose(stable);
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
  }, [choose]);

  const shoot = useCallback(() => {
    if (countdown !== null) return;
    setCountdown(3);
    playSelectSound();
    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playSelectSound();
      } else {
        clearInterval(interval);
        setCountdown(null);
        // Read at the moment of SHOOT: whatever pose is held now wins.
        onGestureDetected(chosenRef.current);
      }
    }, COUNT_STEP_MS);
  }, [countdown, onGestureDetected]);

  const status =
    tracking === 'permission'
      ? 'Waiting for camera permission…'
      : tracking === 'loading'
        ? 'Loading hand tracking…'
      : tracking === 'tracking'
        ? live
          ? `I see ${MOVE_LABEL[live].toLowerCase()}`
          : 'Show a rock, paper or scissors hand'
        : 'Tracking off — pick your move below';

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" role="dialog" aria-label="Camera">
      <div className="bg-bone rounded-[2rem] max-w-md w-full p-6 flex flex-col items-center gap-4 relative">
        <button type="button" onClick={onClose} aria-label="Close camera" className="absolute top-4 right-4 btn !min-h-10 !px-4">
          Close
        </button>

        <h3 className="display text-4xl self-start">Camera</h3>

        {cameraError ? (
          <div className="w-full rounded-2xl bg-sheet p-4 text-base">
            {cameraError} Use the move tiles or the R / P / S keys instead.
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] bg-ink rounded-2xl overflow-hidden grid place-items-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              {countdown !== null && <div className="display text-9xl text-bone drop-shadow">{countdown}</div>}
            </div>
            <span
              data-testid="gesture-status"
              className={`absolute bottom-3 left-3 rounded-full px-3 py-1 text-sm font-semibold ${
                live ? 'bg-sheet text-ink' : 'bg-bone text-ink'
              }`}
            >
              {status}
            </span>
          </div>
        )}

        <div className="w-full">
          <div className="label mb-2">{tracking === 'tracking' ? 'Detected move (tap to override)' : 'Your move'}</div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Your move">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
              <button
                key={move}
                type="button"
                className="choice !py-2 text-center font-semibold"
                aria-pressed={chosen === move}
                onClick={() => choose(move)}
              >
                {MOVE_LABEL[move]}
              </button>
            ))}
          </div>
        </div>

        <button type="button" disabled={countdown !== null} onClick={shoot} className="btn btn-solid w-full">
          {countdown !== null ? `Shooting in ${countdown}…` : 'Shoot on 3-2-1'}
        </button>
      </div>
    </div>
  );
};
