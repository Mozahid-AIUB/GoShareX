import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/config/supabase.config';

/**
 * useAdminStats — admin dashboard-এর সব সংখ্যা টেনে আনে।
 *
 * `admin_stats()` RPC কল করে (server-side গার্ড আছে: admin না হলে error)।
 * প্রতি ৩০ সেকেন্ডে auto-refresh → কাছাকাছি real-time। pull-to-refresh-এর
 * জন্য refresh() ও দেয়।
 */

export type DailyPoint = { date: string; users: number; rides: number };

export type AdminStats = {
  total_users: number;
  active_24h: number;
  active_7d: number;
  new_today: number;
  live_now: number;
  total_rides: number;
  completed_rides: number;
  total_saved: number;
  cancelled_rides: number;
  suspended_users: number;
  striked_users: number;
  stuck_requests: number;
  total_reports: number;
  req_total: number;
  req_accepted: number;
  daily: DailyPoint[];
  generated_at: string;
};

const REFRESH_MS = 30_000;

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('admin_stats');
    if (!mounted.current) return;
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setStats(data as AdminStats);
    setError(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [load]);

  return { stats, loading, error, refresh };
}
