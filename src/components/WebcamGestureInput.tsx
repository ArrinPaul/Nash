import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Move } from '../data/types';
import { playSelectSound } from '../audio/sound';
import { MOVE_LABEL } from './moveTheme';

interface WebcamGestureInputProps {
  onGestureDetected: (move: Move) => void;
  onClose: () => void;
}

export const WebcamGestureInput: React.FC<WebcamGestureInputProps> = ({ onGestureDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedPreview, setDetectedPreview] = useState<Move>('rock');

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        .then((s) => {
          activeStream = s;
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((err) => {
          console.warn('Webcam access error:', err);
          setCameraError('Webcam unavailable or permission denied.');
        });
    } else {
      setCameraError('Webcam API not supported in this browser environment.');
    }
    return () => {
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const triggerCountdown = useCallback(
    (targetMove?: Move) => {
      if (countdown !== null) return;
      setCountdown(3);
      const chosen = targetMove || detectedPreview;
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
          onGestureDetected(chosen);
        }
      }, 550);
    },
    [countdown, detectedPreview, onGestureDetected]
  );

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4" role="dialog" aria-label="Camera">
      <div className="bg-bone rounded-[2rem] max-w-md w-full p-6 flex flex-col items-center gap-5 relative">
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
              {countdown !== null ? (
                <div className="display text-9xl text-bone drop-shadow">{countdown}</div>
              ) : (
                <span className="rounded-full bg-bone px-3 py-1 text-sm font-semibold">Hold your hand in frame</span>
              )}
            </div>
          </div>
        )}

        <div className="w-full">
          <div className="label mb-2">Your move</div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Your move">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => (
              <button
                key={move}
                type="button"
                className="choice !py-2 text-center font-semibold"
                aria-pressed={detectedPreview === move}
                onClick={() => setDetectedPreview(move)}
              >
                {MOVE_LABEL[move]}
              </button>
            ))}
          </div>
        </div>

        <button type="button" disabled={countdown !== null} onClick={() => triggerCountdown()} className="btn btn-solid w-full">
          {countdown !== null ? `Shooting in ${countdown}…` : 'Shoot on 3-2-1'}
        </button>
      </div>
    </div>
  );
};
