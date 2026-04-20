import { useEffect, useRef } from 'react';

/**
 * A declarative setInterval hook that cleans up on unmount.
 * Pass `null` as delay to pause the interval.
 *
 * @param callback - Function to call on each tick
 * @param delay - Interval in milliseconds; pass null to pause
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback);

  // Keep the ref current without restarting the timer
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearInterval(id);
    };
  }, [delay]);
}
