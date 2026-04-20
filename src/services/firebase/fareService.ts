/**
 * fareService — reads and manages fare data in Firestore.
 * Collection: `fare_table`
 * Document id pattern: `${pickup}__${destination}` (double underscore separator)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';

const COLLECTION = 'fare_table';

// ─── Default fare seed data (BDT amounts) ────────────────────────────────────
const DEFAULT_FARES: Record<string, number> = {
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
 * Fetch the entire fare table from Firestore.
 * Returns an object keyed by `"${pickup}__${destination}"` with BDT fare values.
 */
export async function getFareTable(): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, COLLECTION));
  const table: Record<string, number> = {};
  snap.forEach((d) => {
    const data = d.data() as { fare: number };
    table[d.id] = data.fare;
  });
  return table;
}

/**
 * Retrieve the fare for a specific pickup → destination pair.
 * Throws if the fare entry is not found in either direction.
 */
export async function getFare(pickup: string, destination: string): Promise<number> {
  const key = `${pickup}__${destination}`;
  const snap = await getDoc(doc(db, COLLECTION, key));

  if (!snap.exists()) {
    // Try reverse direction — rickshaw pricing is often symmetric
    const reverseSnap = await getDoc(doc(db, COLLECTION, `${destination}__${pickup}`));
    if (!reverseSnap.exists()) {
      throw new Error(`No fare found for route: ${pickup} → ${destination}`);
    }
    return (reverseSnap.data() as { fare: number }).fare;
  }

  return (snap.data() as { fare: number }).fare;
}

/**
 * Split a fare evenly among `riders` people.
 * Always rounds up to the nearest integer (BDT has no fractional coins in practice).
 */
export function calculateSplit(fare: number, riders: number): number {
  if (riders <= 0) throw new RangeError('riders must be a positive integer');
  return Math.ceil(fare / riders);
}

/**
 * Seeds the Firestore `fare_table` collection with default AIUB-area fares.
 * Skips documents that already exist to avoid overwriting admin edits.
 */
export async function seedFareTable(): Promise<void> {
  const writes = Object.entries(DEFAULT_FARES).map(async ([key, fare]) => {
    const ref = doc(db, COLLECTION, key);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const [pickup, destination] = key.split('__');
      await setDoc(ref, {
        fare,
        pickup,
        destination,
        createdAt: Date.now(),
      });
    }
  });

  await Promise.all(writes);
}
