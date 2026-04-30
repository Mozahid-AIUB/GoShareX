/**
 * services/board/postService.ts
 * Business-logic layer for the ride board.
 */

export {
  createPost,
  getPosts,
  joinPost,
  deletePost,
  subscribeToDestinationPosts,
} from '@/services/firebase/postService';
export type { PostData } from '@/services/firebase/postService';

import { PostData } from '@/services/firebase/postService';

export function validatePost(post: PostData): string | null {
  if (!post.authorId?.trim()) return 'Author ID is required.';
  if (!post.authorName?.trim()) return 'Author name is required.';
  if (!post.destination?.trim()) return 'Please enter a destination.';
  if (!post.meetPoint?.trim()) return 'Please enter a meet point.';
  if (post.note && post.note.length > 200) return 'Note must be 200 characters or fewer.';
  if (post.maxRiders !== undefined && (post.maxRiders < 2 || post.maxRiders > 4)) {
    return 'Max riders must be between 2 and 4.';
  }
  return null;
}

export function formatTimeLabel(scheduledTime: string | Date): string {
  if (scheduledTime === 'now' || scheduledTime === 'Now') return 'Leaving now';

  const date = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;
  if (isNaN(date.getTime())) return String(scheduledTime);

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
