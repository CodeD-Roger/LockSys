import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

const EVENTS: Array<keyof WindowEventMap> = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * Locks the vault after a period of inactivity.
 * Listens to user interaction events and resets the timer on each one.
 *
 * @param timeoutMs  Inactivity timeout in milliseconds (default: 5 minutes)
 */
export function useAutoLock(timeoutMs = 5 * 60 * 1000) {
  const { user, isLocked, lock } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || isLocked) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(lock, timeoutMs);
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // Start the initial timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, isLocked, lock, timeoutMs]);
}
