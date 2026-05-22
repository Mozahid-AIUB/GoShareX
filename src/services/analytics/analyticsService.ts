/**
 * analyticsService.ts
 * Firebase Analytics via the JS SDK (firebase/analytics).
 * All calls are fire-and-forget — analytics never impacts UX.
 */

import { getAnalytics, logEvent, setUserId, setUserProperties as fbSetUserProperties, isSupported } from 'firebase/analytics';
import { app } from '@/config/firebase.config';
import { logger } from '@/utils/logger';

let _analytics: ReturnType<typeof getAnalytics> | null = null;

async function analytics() {
  if (_analytics) return _analytics;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  _analytics = getAnalytics(app);
  return _analytics;
}

export function trackEvent(name: string, params: Record<string, any> = {}): void {
  analytics()
    .then((a) => { if (a) logEvent(a, name, params); })
    .catch((err) => logger.warn('analytics.trackEvent', err));
}

export function trackScreen(screenName: string): void {
  trackEvent('screen_view', { screen_name: screenName, screen_class: screenName });
}

export function trackRideComplete(rideId: string, fare: number, saved: number): void {
  trackEvent('ride_complete', { ride_id: rideId, fare_bdt: fare, saved_bdt: saved, currency: 'BDT' });
}

export function setUserProperties(uid: string, props: Record<string, string>): void {
  analytics()
    .then((a) => {
      if (!a) return;
      setUserId(a, uid);
      fbSetUserProperties(a, props);
    })
    .catch((err) => logger.warn('analytics.setUserProperties', err));
}
