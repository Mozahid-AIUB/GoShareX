/**
 * searchHistoryService — tracks destination AND pickup usage per user.
 * Entries are sorted by usage count (desc), then recency.
 * Max 20 entries per category. Powers smart FROM/TO suggestions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEST_KEY   = 'gosharex_search_history_v1';
const PICKUP_KEY = 'gosharex_pickup_history_v1';
const MAX_ENTRIES = 20;

export interface SearchEntry {
  id: string;
  name: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  count: number;
  lastUsed: number;
}

export interface PickupHistoryEntry {
  id: string;       // pickup point id, or 'current_location'
  name: string;
  nameBn?: string;
  lat?: number;
  lng?: number;
  count: number;
  lastUsed: number;
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function loadRaw<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function saveRaw<T>(key: string, entries: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch {}
}

// ─── Destination history ──────────────────────────────────────────────────────

/** Record a destination search — increments count if exists, inserts if new. */
export async function recordSearch(entry: Omit<SearchEntry, 'count' | 'lastUsed'>): Promise<void> {
  const entries = await loadRaw<SearchEntry>(DEST_KEY);
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    entries[idx].count += 1;
    entries[idx].lastUsed = Date.now();
    entries[idx].name = entry.name;
  } else {
    entries.push({ ...entry, count: 1, lastUsed: Date.now() });
  }
  entries.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  await saveRaw(DEST_KEY, entries.slice(0, MAX_ENTRIES));
}

/** Get top N popular destinations, sorted by usage count. */
export async function getPopularSearches(limit = 6): Promise<SearchEntry[]> {
  const entries = await loadRaw<SearchEntry>(DEST_KEY);
  return entries
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

/** Get the single most-used destination (for smart default TO). */
export async function getMostUsedDestination(): Promise<SearchEntry | null> {
  const entries = await getPopularSearches(1);
  return entries[0] ?? null;
}

/** Clear destination history. */
export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(DEST_KEY);
}

// ─── Pickup history ───────────────────────────────────────────────────────────

/** Record a pickup point selection — increments count if exists, inserts if new. */
export async function recordPickupUsage(entry: Omit<PickupHistoryEntry, 'count' | 'lastUsed'>): Promise<void> {
  const entries = await loadRaw<PickupHistoryEntry>(PICKUP_KEY);
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    entries[idx].count += 1;
    entries[idx].lastUsed = Date.now();
    entries[idx].name = entry.name;
  } else {
    entries.push({ ...entry, count: 1, lastUsed: Date.now() });
  }
  entries.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
  await saveRaw(PICKUP_KEY, entries.slice(0, MAX_ENTRIES));
}

/** Get top N frequently used pickup points, sorted by count. GPS entries are excluded. */
export async function getFrequentPickups(limit = 5): Promise<PickupHistoryEntry[]> {
  const entries = await loadRaw<PickupHistoryEntry>(PICKUP_KEY);
  // Filter out any GPS/current_location entries that may have been saved previously
  const fixed = entries.filter(
    e => e.id !== 'current_location' && !e.name.startsWith('My current location')
  );
  return fixed
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

/** Get the single most-used pickup point (for smart default FROM). */
export async function getMostUsedPickup(): Promise<PickupHistoryEntry | null> {
  const entries = await getFrequentPickups(1);
  return entries[0] ?? null;
}

/** Clear pickup history. */
export async function clearPickupHistory(): Promise<void> {
  await AsyncStorage.removeItem(PICKUP_KEY);
}
