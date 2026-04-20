/**
 * services/board/postService.ts
 * Business-logic layer for the ride board.
 * Re-exports firebase/postService and adds validation + formatting helpers.
 */

// ─── Re-exports from firebase layer ──────────────────────────────────────────
export {
  createPost,
  getPosts,
  joinPost,
  deletePost,
  subscribeToDestinationPosts,
} from '@/services/firebase/postService';
export type { PostData } from '@/services/firebase/postService';

import { PostData } from '@/services/firebase/postService';

// ─── Business-logic validation ────────────────────────────────────────────────

const VALID_DESTINATIONS = [
  'Uttara',
  'Airport',
  'Farmgate',
  'Motijheel',
  'Gulshan',
  'Banani',
  'Mirpur 10',
  'Mirpur 1',
  'Dhanmondi',
];

const VALID_PICKUP_POINTS = [
  'AIUB Gate',
  'Kuril Bishwa Road',
  'Progati Sarani',
  'Natun Bazar',
];

/**
 * Validate a PostData object before sending to Firestore.
 *
 * @returns An error string describing the first validation failure, or `null`
 *          if the data is valid.
 */
export function validatePost(post: PostData): string | null {
  if (!post.authorId?.trim()) {
    return 'Author ID is required.';
  }

  if (!post.authorName?.trim()) {
    return 'Author name is required.';
  }

  if (!post.destination?.trim()) {
    return 'Please select a destination.';
  }

  if (!VALID_DESTINATIONS.includes(post.destination)) {
    return `"${post.destination}" is not a recognized destination.`;
  }

  if (!post.pickupPoint?.trim()) {
    return 'Please select a pickup point.';
  }

  if (!VALID_PICKUP_POINTS.includes(post.pickupPoint)) {
    return `"${post.pickupPoint}" is not a recognized pickup point.`;
  }

  if (post.destination === post.pickupPoint) {
    return 'Pickup point and destination cannot be the same.';
  }

  if (post.note && post.note.length > 200) {
    return 'Note must be 200 characters or fewer.';
  }

  if (post.maxRiders !== undefined && (post.maxRiders < 2 || post.maxRiders > 4)) {
    return 'Max riders must be between 2 and 4.';
  }

  return null;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Convert a scheduled time value to a human-readable label.
 *
 * - `"now"` → "Leaving now"
 * - ISO string / Date → "Today, 3:45 PM" or "Tomorrow, 9:00 AM"
 */
export function formatTimeLabel(scheduledTime: string | Date): string {
  if (scheduledTime === 'now') return 'Leaving now';

  const date =
    typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;

  if (isNaN(date.getTime())) return 'Unknown time';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
