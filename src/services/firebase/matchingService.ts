import { calculateDistance } from '@/utils/haversine';
import ENV from '@/config/env';

// ─── Search radius tiers based on GPS accuracy ────────────────────────────────
// GPS accuracy (meters) → search radius (meters)
// Poor GPS → wider net so user still sees riders
// Good GPS → tight radius so only truly nearby riders show

// BD urban GPS is typically ±50–120m due to buildings & overhead structures.
// Base radii are set generously so users actually find riders.
// Match quality (score) ranks closer/same-destination riders higher.
export const RADIUS_TIERS = [
  { maxAccuracy: 20, searchRadius: 150, label: '150m', quality: 'Excellent GPS' },
  { maxAccuracy: 50, searchRadius: 250, label: '250m', quality: 'Good GPS' },
  { maxAccuracy: 100, searchRadius: 400, label: '400m', quality: 'Fair GPS' },
  { maxAccuracy: 200, searchRadius: 600, label: '600m', quality: 'Weak GPS' },
  { maxAccuracy: Infinity, searchRadius: 800, label: '800m', quality: 'Wide search' },
] as const;

export type RadiusTier = (typeof RADIUS_TIERS)[number];

/**
 * Returns the appropriate search radius and quality label
 * based on current GPS accuracy.
 * @param accuracyMeters — GPS accuracy from expo-location (lower = better)
 */
export function getSearchRadius(accuracyMeters: number | null | undefined): RadiusTier {
  if (accuracyMeters == null || accuracyMeters <= 0) {
    // No GPS fix yet — use widest radius so user doesn't see empty screen
    return RADIUS_TIERS[RADIUS_TIERS.length - 1];
  }
  return RADIUS_TIERS.find(t => accuracyMeters <= t.maxAccuracy) ?? RADIUS_TIERS[RADIUS_TIERS.length - 1];
}

export interface RiderMatch {
  userId: string;
  name: string;
  distance: number;
  destination: string;
  pickupPoint: string;
  rating: number;
  badge: string;
  lat: number;
  lng: number;
  isMatch: boolean;
  vehicleType?: string;
}

/** Shape of raw RTDB active_rider entries before mapping to RiderMatch */
export interface ActiveRiderRaw {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  destination: string;
  destLat?: number;   // গন্তব্যের lat (geo-matching-এর জন্য)
  destLng?: number;   // গন্তব্যের lng
  pickupPoint: string;
  rating?: number;
  badge?: string;
  vehicleType?: string;
  status?: string;
  timestamp?: number;
}

// দুই গন্তব্য এই দূরত্বের (মিটার) মধ্যে হলে = একই গন্তব্য = match।
// Kuril vs Kuril Chowrasta (~৫০০m) ধরবে; Kuril vs Banani (~৩km) না।
// ৫০০m = কড়া সীমা — শুধু সত্যিকারের কাছের গন্তব্যকে "একই জায়গা" ধরে।
// নোট: এটা meet distance (zone 150/250/350m) থেকে আলাদা — এটা গন্তব্য↔গন্তব্য,
// zone হলো তুমি↔rider। দুটো আলাদা, যোগ হয় না।
export const SAME_DESTINATION_RADIUS_M = 500;

/**
 * একটা lat/lng জোড়া valid কিনা — accurate match-এর জন্য জরুরি guard।
 * GPS fail হলে প্রায়ই 0,0 (Gulf of Guinea) বা NaN আসে — সেগুলো বাদ দিই,
 * নাহলে ভুল match হয় (দুজনের 0,0 মিলে গিয়ে "match" দেখাবে)।
 */
function isValidLatLng(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&        // 0,0 = GPS fail
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Matching Service
 * Handles proximity-based rider matching algorithm
 */
class MatchingService {
  /**
   * Find nearby riders within proximity radius
   */
  findNearbyRiders(
    currentLat: number,
    currentLng: number,
    currentDestination: string,
    allRiders: ActiveRiderRaw[],
    accuracyMeters?: number,
    currentDestLat?: number,   // নিজের গন্তব্যের lat (geo-matching)
    currentDestLng?: number,   // নিজের গন্তব্যের lng
    overrideVisibleRadius?: number,  // ইউজার zone bar দিয়ে নিজে radius ঠিক করলে
  ): RiderMatch[] {
    const matches: RiderMatch[] = [];
    const tier = getSearchRadius(accuracyMeters);
    const matchRadius = tier.searchRadius;
    // ইউজার zone bar দিয়ে radius দিলে সেটাই মানি (নিজের নিয়ন্ত্রণ);
    // নাহলে ঘন BD শহরে map যেন খালি না দেখায় — কমপক্ষে 1km।
    const visibleRadius = overrideVisibleRadius != null
      ? overrideVisibleRadius
      : Math.max(matchRadius, 1000);

    for (const rider of allRiders) {
      const distance = calculateDistance(
        currentLat,
        currentLng,
        rider.lat,
        rider.lng
      );

      if (distance > visibleRadius) continue;

      // ─── GEO-MATCH: text না, গন্তব্যের COORDINATE মেলাই ───
      // দুজনের গন্তব্য ~৭০০ মিটারের মধ্যে = একই গন্তব্য = match।
      // ("Kuril" vs "Kuril Bishwa Road" — ভিন্ন text, কাছাকাছি জায়গা → match)
      // এখানে আসা মানেই rider ইতিমধ্যে visibleRadius-এর ভিতরে (লাইন উপরে guard),
      // তাই isMatch-এ আর distance চেক করার দরকার নেই — শুধু গন্তব্য মেলে কিনা দেখি।
      let isMatch: boolean;
      const haveBothDestCoords =
        isValidLatLng(currentDestLat, currentDestLng) &&
        isValidLatLng(rider.destLat, rider.destLng);

      if (haveBothDestCoords) {
        const destGap = calculateDistance(
          currentDestLat!, currentDestLng!, rider.destLat!, rider.destLng!,
        );
        isMatch = destGap <= SAME_DESTINATION_RADIUS_M;
      } else {
        // fallback (valid lat/lng নেই) — পুরনো text compare।
        // GPS fail হলে এখানে আসবে; অন্তত text মিললে match দেখাই।
        isMatch = rider.destination === currentDestination;
      }

      matches.push({
        userId: rider.id,
        name: rider.name || 'Unknown',
        distance: Math.round(distance),
        destination: rider.destination,
        pickupPoint: rider.pickupPoint,
        rating: rider.rating || 5.0,
        badge: rider.badge || 'New Rider',
        vehicleType: rider.vehicleType ?? 'rickshaw',
        lat: rider.lat,
        lng: rider.lng,
        isMatch,
      });
    }

    // Matches (same destination, within radius) first, then by distance
    return matches.sort((a, b) => {
      if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
      return a.distance - b.distance;
    });
  }

  /**
   * Check if two riders are compatible for ride sharing
   */
  areRidersCompatible(
    rider1: RiderMatch,
    rider2: RiderMatch
  ): boolean {
    // Distance check removed — findNearbyRiders() already filters by radius
    // before calling this. Keeping it here with hardcoded undefined caused
    // the widest fallback radius (800m) to always be used, ignoring GPS accuracy.
    return (
      rider1.destination === rider2.destination &&
      rider1.pickupPoint === rider2.pickupPoint
    );
  }

  /**
   * Calculate match score (0-100)
   */
  calculateMatchScore(match: RiderMatch): number {
    let score = 100;

    // Distance penalty (closer = better)
    const distancePenalty = (match.distance / ENV.proximityRadiusMeters) * 30;
    score -= distancePenalty;

    // Rating bonus
    const ratingBonus = (match.rating - 3) * 10;
    score += ratingBonus;

    // Destination match bonus
    if (match.isMatch) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Filter matches by destination
   */
  filterByDestination(
    matches: RiderMatch[],
    destination: string
  ): RiderMatch[] {
    return matches.filter(match => match.destination === destination);
  }

  /**
   * Get best match from list
   */
  getBestMatch(matches: RiderMatch[]): RiderMatch | null {
    if (matches.length === 0) return null;

    return matches.reduce((best, current) => {
      const bestScore = this.calculateMatchScore(best);
      const currentScore = this.calculateMatchScore(current);
      return currentScore > bestScore ? current : best;
    });
  }
}

export default new MatchingService();