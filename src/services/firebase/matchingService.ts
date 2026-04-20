import { calculateDistance, isWithinRadius } from '@/utils/haversine';
import ENV from '@/config/env';

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
    allRiders: any[]
  ): RiderMatch[] {
    const matches: RiderMatch[] = [];

    for (const rider of allRiders) {
      const distance = calculateDistance(
        currentLat,
        currentLng,
        rider.lat,
        rider.lng
      );

      // Check if within proximity radius
      if (distance <= ENV.proximityRadiusMeters * 10) { // Extended radius for visibility
        const isMatch = 
          rider.destination === currentDestination &&
          distance <= ENV.proximityRadiusMeters;

        matches.push({
          userId: rider.id,
          name: rider.name || 'Unknown',
          distance: Math.round(distance),
          destination: rider.destination,
          pickupPoint: rider.pickupPoint,
          rating: rider.rating || 5.0,
          badge: rider.badge || 'New Rider',
          lat: rider.lat,
          lng: rider.lng,
          isMatch,
        });
      }
    }

    // Sort by distance
    return matches.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if two riders are compatible for ride sharing
   */
  areRidersCompatible(
    rider1: RiderMatch,
    rider2: RiderMatch
  ): boolean {
    return (
      rider1.destination === rider2.destination &&
      rider1.pickupPoint === rider2.pickupPoint &&
      rider1.distance <= ENV.proximityRadiusMeters
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
