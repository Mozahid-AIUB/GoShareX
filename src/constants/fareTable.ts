import { DESTINATIONS } from './destinations';

export interface FareEntry {
  from: string;
  to: string;
  fare: number;
}

// No hardcoded pickup→destination fare table — pickup points are now GPS-based.
// Fare is derived from the destination's baseFare directly.
export const FARE_TABLE: Record<string, number> = {};

export const getFare = (pickupId: string, destinationId: string): number => {
  // Check static table first (future extensibility)
  const key = `${pickupId}_${destinationId}`;
  if (FARE_TABLE[key]) return FARE_TABLE[key];

  // Use destination's baseFare as the standard fare
  const destination = DESTINATIONS.find(d => d.id === destinationId);
  if (destination?.baseFare) return destination.baseFare;

  // Unknown destination — return 0 (caller should handle)
  return 0;
};

export const getSplitFare = (
  pickupId: string,
  destinationId: string,
  riders: number
): number => {
  const baseFare = getFare(pickupId, destinationId);
  return Math.ceil(baseFare / riders);
};
