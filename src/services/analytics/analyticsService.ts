/**
 * analyticsService.ts
 * Thin wrapper around Firebase Analytics / @react-native-firebase/analytics.
 * All calls are fire-and-forget with silent failure so analytics never
 * impacts the user experience.
 */

let _analytics: any = null;

async function getAnalytics() {
  if (!_analytics) {
    const mod = await import('@react-native-firebase/analytics');
    _analytics = mod.default();
  }
  return _analytics;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a custom analytics event.
 *
 * @param name   Event name (snake_case, max 40 chars per Firebase spec)
 * @param params Optional key-value parameters
 */
export function trackEvent(name: string, params: object = {}): void {
  getAnalytics()
    .then((analytics: any) => analytics.logEvent(name, params))
    .catch((err: unknown) => console.warn('[analytics] trackEvent failed:', err));
}

/**
 * Record a screen view. Should be called from each screen's `useEffect`.
 *
 * @param screenName Human-readable screen name
 */
export function trackScreen(screenName: string): void {
  getAnalytics()
    .then((analytics: any) =>
      analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      }),
    )
    .catch((err: unknown) => console.warn('[analytics] trackScreen failed:', err));
}

/**
 * Log a completed ride event with fare and savings data.
 */
export function trackRideComplete(
  rideId: string,
  fare: number,
  saved: number,
): void {
  trackEvent('ride_complete', {
    ride_id: rideId,
    fare_bdt: fare,
    saved_bdt: saved,
    currency: 'BDT',
  });
}

/**
 * Set persistent user properties that will be attached to all future events.
 *
 * @param uid   Firebase Auth UID
 * @param props Key-value properties (string values only per Firebase spec)
 */
export function setUserProperties(uid: string, props: object): void {
  getAnalytics()
    .then(async (analytics: any) => {
      await analytics.setUserId(uid);
      for (const [key, value] of Object.entries(props)) {
        await analytics.setUserProperty(key, String(value));
      }
    })
    .catch((err: unknown) => console.warn('[analytics] setUserProperties failed:', err));
}
