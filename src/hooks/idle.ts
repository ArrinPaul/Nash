import { useEffect, useRef } from 'react';

export const IDLE_TIMEOUT_MS = 45000;

/** Dispatch on window to count as player activity without a touch or key press. */
export const ACTIVITY_EVENT = 'nash-activity';

export function isIdle(lastInteractionAt: number, now: number, timeoutMs: number): boolean {
  return now - lastInteractionAt >= timeoutMs;
}

export function useIdleReturn(
  active: boolean,
  onIdle: () => void,
  timeoutMs: number = IDLE_TIMEOUT_MS
): void {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        onIdleRef.current();
      }, timeoutMs);
    };

    resetTimer();

    const handleInteraction = () => {
      resetTimer();
    };

    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    // Hands-free play (camera mode) never touches the screen, so it reports activity itself.
    window.addEventListener(ACTIVITY_EVENT, handleInteraction);

    return () => {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener(ACTIVITY_EVENT, handleInteraction);
    };
  }, [active, timeoutMs]);
}
