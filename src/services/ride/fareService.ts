/**
 * ride/fareService.ts
 * Client-side fare table and formatting utilities.
 *
 * This module provides synchronous fare lookups without a Firestore round-trip,
 * using a hard-coded table that mirrors the database seed data.
 * Use services/firebase/fareService.ts for admin-editable remote fares.
 */

// ─── Fare table ───────────────────────────────────────────────────────────────

/**
 * All pickup → destination combinations and their full rickshaw fares in BDT.
 * Keys follow the pattern `"${pickup}__${destination}"`.
 */
export const FARE_TABLE: Record<string, number> = {
  'AIUB Gate__Uttara': 20,
  'AIUB Gate__Airport': 30,
  'AIUB Gate__Farmgate': 60,
  'AIUB Gate__Motijheel': 80,
  'AIUB Gate__Gulshan': 50,
  'AIUB Gate__Banani': 45,
  'AIUB Gate__Mirpur 10': 30,
  'AIUB Gate__Mirpur 1': 40,
  'AIUB Gate__Dhanmondi': 70,
  'Uttara__Airport': 15,
  'Uttara__Farmgate': 50,
  'Uttara__Motijheel': 70,
  'Uttara__Gulshan': 40,
  'Uttara__Banani': 35,
  'Uttara__Mirpur 10': 25,
  'Uttara__Mirpur 1': 30,
  'Uttara__Dhanmondi': 60,
  'Airport__Farmgate': 40,
  'Airport__Motijheel': 60,
  'Airport__Gulshan': 30,
  'Airport__Banani': 25,
  'Airport__Mirpur 10': 20,
  'Airport__Mirpur 1': 25,
  'Airport__Dhanmondi': 50,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Synchronous fare lookup. Checks both directions.
 * Returns 0 if the route is not in the table (callers should handle gracefully).
 */
export function getFare(pickup: string, destination: string): number {
  return (
    FARE_TABLE[`${pickup}__${destination}`] ??
    FARE_TABLE[`${destination}__${pickup}`] ??
    0
  );
}

/**
 * Get the per-person split fare for a given route.
 *
 * @param pickup       Pickup point name
 * @param destination  Destination name
 * @param riders       Number of riders sharing the rickshaw (default: 2)
 * @returns            Amount each rider pays, rounded up to the nearest integer
 */
export function getSplitFare(
  pickup: string,
  destination: string,
  riders: number = 2,
): number {
  if (riders <= 0) throw new RangeError('riders must be a positive integer');
  const total = getFare(pickup, destination);
  return Math.ceil(total / riders);
}

/**
 * Format a BDT amount with the Bengali taka sign.
 *
 * @example formatFare(20) → "৳20"
 */
export function formatFare(amount: number): string {
  return `৳${amount}`;
}
