/**
 * roadsService.ts — Google Roads API client.
 *
 * Use cases:
 * - snapToRoad: align noisy GPS points to actual roads (smooth marker movement)
 * - nearestRoad: find the closest road segment for a single point
 *
 * Quota note: Roads API is metered per request. Always batch points
 * (up to 100 per call) and cache results when possible.
 */

import ENV from '@/config/env';
import { fetchJson, GOOGLE_API_ENDPOINTS, GoogleApiError } from './base';
import { logger } from '@/utils/logger';

export type LatLng = {
  latitude: number;
  longitude: number;
};

type SnapToRoadsResponse = {
  snappedPoints?: Array<{
    location: { latitude: number; longitude: number };
    originalIndex?: number;
    placeId?: string;
  }>;
  warningMessage?: string;
};

// Snap-to-roads একটা "nice-to-have" smoothing feature — GPS marker রাস্তায়
// snap করে মসৃণ করে। কিন্তু Roads API আলাদাভাবে enable করা না থাকলে (বা key-তে
// restriction থাকলে) Google প্রতি call-এ 403/404 দেয়। আগে প্রতি ৫ সেকেন্ডে
// ব্যর্থ call হয়ে log ভরত + battery/quota নষ্ট করত।
//
// Circuit breaker: config-error (403/404 — enable/restriction সমস্যা, retry-তে
// লাভ নেই) পেলে এই session-এ snapping পুরোপুরি বন্ধ করি; transient error
// (timeout/network) পরপর কয়েকবার হলে একটা cooldown দিই। বন্ধ থাকলে raw GPS
// সরাসরি ফেরত — map তবু ঠিকঠাক চলে।
const MAX_TRANSIENT_FAILURES = 3;
const COOLDOWN_MS = 10 * 60 * 1000; // transient ব্যর্থতায় ১০ মিনিট বিরতি

class RoadsService {
  // true হলে snapping এই session-এ পাকাপাকি বন্ধ (config error)।
  private permanentlyDisabled = false;
  // transient ব্যর্থতার গণনা ও cooldown শেষ হওয়ার সময়।
  private transientFailures = 0;
  private cooldownUntil = 0;

  /** snapping এখন available কিনা — না হলে raw GPS-এ fallback করি। */
  private isAvailable(): boolean {
    if (this.permanentlyDisabled) return false;
    if (Date.now() < this.cooldownUntil) return false;
    return true;
  }

  /**
   * Snap a path of GPS points to the nearest roads.
   * Returns aligned coordinates that lie exactly on a road centerline.
   *
   * @param points Up to 100 lat/lng pairs in order of travel
   * @param interpolate If true, Google adds extra points to follow road geometry
   */
  async snapToRoads(points: LatLng[], interpolate = true): Promise<LatLng[]> {
    if (points.length === 0) return [];
    // API key নেই বা circuit breaker খোলা — চুপচাপ raw points ফেরত।
    if (!ENV.googleMapsApiKey || !this.isAvailable()) {
      return points;
    }
    if (points.length > 100) {
      logger.warn('roadsService', `snapToRoads called with ${points.length} points; truncating to 100`);
      points = points.slice(0, 100);
    }

    const path = points.map((p) => `${p.latitude},${p.longitude}`).join('|');
    const url = `${GOOGLE_API_ENDPOINTS.roadsSnap}?path=${encodeURIComponent(path)}&interpolate=${interpolate}&key=${ENV.googleMapsApiKey}`;

    try {
      const data = await fetchJson<SnapToRoadsResponse>(url);
      if (data.warningMessage) {
        logger.warn('roadsService.snap', data.warningMessage);
      }
      // সফল — counters রিসেট।
      this.transientFailures = 0;
      return (data.snappedPoints ?? []).map((p) => ({
        latitude: p.location.latitude,
        longitude: p.location.longitude,
      }));
    } catch (err) {
      this.handleFailure(err);
      // On failure, return original points (graceful degradation)
      return points;
    }
  }

  /** ব্যর্থতা শ্রেণিবদ্ধ করে circuit breaker চালাই — একবারই log করি। */
  private handleFailure(err: unknown): void {
    const status = err instanceof GoogleApiError ? err.status : undefined;
    // 403/404 → Roads API enable নেই বা key restriction। retry-তে লাভ নেই —
    // session-এর জন্য বন্ধ করি, একবার পরিষ্কার warning দিই।
    if (status === 403 || status === 404) {
      this.permanentlyDisabled = true;
      logger.warn(
        'roadsService',
        `Roads API unavailable (HTTP ${status}) — snap-to-roads disabled for this session, ` +
          `using raw GPS. Enable "Roads API" in Google Cloud Console for the Maps key to restore smoothing.`
      );
      return;
    }
    // transient (timeout/network) — কয়েকবার পরপর হলে cooldown।
    this.transientFailures += 1;
    if (this.transientFailures >= MAX_TRANSIENT_FAILURES) {
      this.cooldownUntil = Date.now() + COOLDOWN_MS;
      this.transientFailures = 0;
      logger.warn('roadsService', `snap-to-roads paused ${COOLDOWN_MS / 60000}min after repeated network errors`);
    }
  }

  /**
   * Snap a single GPS point to its nearest road.
   * Cheaper than snapToRoads when you only have one point.
   */
  async snapSingle(point: LatLng): Promise<LatLng> {
    const result = await this.snapToRoads([point], false);
    return result[0] ?? point;
  }
}

export default new RoadsService();
