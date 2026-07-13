import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/config/supabase.config';
import { Ride, RideStatus } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';

// firebase useRideStatus-এর Supabase যমজ — একই interface।
// rides টেবিলে single-row real-time subscription + cancel/complete।

interface UseRideStatusResult {
  ride: Ride | null;
  status: RideStatus | null;
  isLoading: boolean;
  cancelRide: (reason?: string) => Promise<boolean>;
  completeRide: () => Promise<boolean>;
}

// rides row (snake_case) -> Ride (camelCase)
function rowToRide(row: any): Ride {
  const toMs = (t: string | null) => (t ? new Date(t).getTime() : undefined);
  return {
    rideId: row.id,
    rider1: row.rider1,
    rider2: row.rider2,
    destination: row.destination,
    pickupPoint: row.pickup_point,
    fare: Number(row.fare ?? 0),
    splitAmount: Number(row.split_amount ?? 0),
    status: row.status as RideStatus,
    confirmedAt: toMs(row.confirmed_at),
    startedAt: toMs(row.started_at),
    completedAt: toMs(row.completed_at),
    cancelledAt: toMs(row.cancelled_at),
    cancelReason: row.cancel_reason ?? undefined,
    rider1Rating: row.rider1_rating ?? undefined,
    rider2Rating: row.rider2_rating ?? undefined,
    rider1Feedback: row.rider1_feedback ?? undefined,
    rider2Feedback: row.rider2_feedback ?? undefined,
  };
}

export function useSupabaseRideStatus(rideId: string): UseRideStatusResult {
  const [ride, setRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!rideId) return;
    setIsLoading(true);
    let cancelled = false;

    // initial load
    supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setRide(null);
        else setRide(rowToRide(data));
        setIsLoading(false);
      });

    // real-time: এই ride row-এর পরিবর্তন শুনি
    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => setRide(rowToRide(payload.new)),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  const cancelRide = useCallback(
    async (reason = 'User cancelled'): Promise<boolean> => {
      if (!user || !rideId) return false;
      try {
        const { error } = await supabase
          .from('rides')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason,
          })
          .eq('id', rideId);
        if (error) throw error;
        return true;
      } catch (err) {
        logger.error('useSupabaseRideStatus.cancel', err);
        return false;
      }
    },
    [rideId, user],
  );

  const completeRide = useCallback(async (): Promise<boolean> => {
    if (!user || !rideId) return false;
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', rideId);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('useSupabaseRideStatus.complete', err);
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
