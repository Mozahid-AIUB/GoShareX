import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Ride, RideStatus } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';
import { db } from '@/services/firebase/config';

interface UseRideStatusResult {
  ride: Ride | null;
  status: RideStatus | null;
  isLoading: boolean;
  cancelRide: (reason?: string) => Promise<boolean>;
  completeRide: () => Promise<boolean>;
}

const RIDES_COLLECTION = 'rides';

/**
 * Real-time subscription to a single ride document.
 * Exposes cancel and complete actions guarded by auth.
 */
export function useRideStatus(rideId: string): UseRideStatusResult {
  const [ride, setRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!rideId) return;

    setIsLoading(true);

    unsubscribeRef.current = onSnapshot(
      doc(db, RIDES_COLLECTION, rideId),
      (doc) => {
        if (doc.exists()) {
          setRide({ ...(doc.data() as Ride), rideId: doc.id });
        } else {
          setRide(null);
        }
        setIsLoading(false);
      },
      (err) => {
        logger.error('useRideStatus.subscribe', err);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeRef.current?.();
    };
  }, [rideId]);

  const cancelRide = useCallback(
    async (reason = 'User cancelled'): Promise<boolean> => {
      if (!user || !rideId) return false;

      try {
        await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
          status: 'cancelled' as RideStatus,
          cancelledAt: Date.now(),
          cancelReason: reason,
        });
        logger.info('useRideStatus', `Ride ${rideId} cancelled`);
        return true;
      } catch (err) {
        logger.error('useRideStatus.cancelRide', err);
        return false;
      }
    },
    [rideId, user],
  );

  const completeRide = useCallback(async (): Promise<boolean> => {
    if (!user || !rideId) return false;

    try {
      await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
        status: 'completed' as RideStatus,
        completedAt: Date.now(),
      });
      logger.info('useRideStatus', `Ride ${rideId} completed`);
      return true;
    } catch (err) {
      logger.error('useRideStatus.completeRide', err);
      return false;
    }
  }, [rideId, user]);

  return {
    ride,
    status: ride?.status ?? null,
    isLoading,
    cancelRide,
    completeRide,
  };
}
