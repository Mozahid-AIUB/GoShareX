import { useEffect, useState } from 'react';

/**
 * Debounce a reactive value by the given delay.
 * The returned value only updates after `delay` ms of inactivity.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
