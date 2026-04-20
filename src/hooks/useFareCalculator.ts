import { useMemo } from 'react';
import { getSplitFare, getFare } from '@/utils/fareTable';

export function useFareCalculator(pickup: string, destination: string, riders = 2) {
  return useMemo(() => ({
    totalFare: getFare(pickup, destination),
    splitFare: getSplitFare(pickup, destination, riders),
    riders,
  }), [pickup, destination, riders]);
}
