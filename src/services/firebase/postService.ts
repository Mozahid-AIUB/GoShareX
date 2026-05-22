/**
 * firebase/postService.ts
 * Low-level Firestore operations for ride-share posts (board).
 * Higher-level business logic lives in services/board/postService.ts.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  QuerySnapshot,
  DocumentData,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Post, PostStatus } from '@/types/post.types';
import { logger } from '@/utils/logger';

const COLLECTION = 'posts';

export interface PostData {
  authorId: string;
  authorName: string;
  authorRating: number;
  authorBadge: string;
  authorPhotoURL?: string | null;
  destination: string;
  meetPoint: string;
  meetTime: string;
  rideType: 'share' | 'bike_owner';
  note?: string | null;
  maxRiders?: number;
}

export interface CreatePostInput extends PostData { }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snapToPost(id: string, data: DocumentData): Post {
  return {
    postId: id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRating: data.authorRating ?? 5,
    authorBadge: data.authorBadge ?? 'New Rider',
    authorPhotoURL: data.authorPhotoURL,
    destination: data.destination,
    meetPoint: data.meetPoint ?? data.pickupPoint ?? '',
    meetTime: data.meetTime ?? data.scheduledTime ?? '',
    scheduledTime: data.scheduledTime ?? '',
    rideType: data.rideType ?? 'share',
    note: data.note,
    status: data.status as PostStatus,
    interested: data.interested ?? [],
    maxRiders: data.maxRiders ?? 2,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new board post. Returns the generated document id.
 */
export async function createPost(post: PostData): Promise<string> {
  logger.debug('postService.createPost', 'Starting with:', {
    authorId: post.authorId,
    authorName: post.authorName,
    destination: post.destination,
    meetPoint: post.meetPoint,
  });

  const id = doc(collection(db, COLLECTION)).id;
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  // Validate required fields
  if (!post.authorId?.trim()) throw new Error('Author ID is required');
  if (!post.authorName?.trim()) throw new Error('Author name is required');
  if (!post.destination?.trim()) throw new Error('Destination is required');
  if (!post.meetPoint?.trim()) throw new Error('Meeting point is required');

  // Strip undefined/null optional fields — Firestore rejects undefined values
  const payload: Record<string, any> = {
    postId: id,
    authorId: post.authorId.trim(),
    authorName: post.authorName.trim(),
    authorRating: post.authorRating ?? 0,
    authorBadge: post.authorBadge ?? 'New Rider',
    authorPhotoURL: post.authorPhotoURL ?? null,
    destination: post.destination.trim(),
    meetPoint: post.meetPoint.trim(),
    meetTime: post.meetTime?.trim() || '',
    rideType: post.rideType ?? 'share',
    scheduledTime: post.meetTime?.trim() || 'Now',
    status: 'open' as PostStatus,
    interested: [],
    maxRiders: Math.max(2, Math.min(4, post.maxRiders ?? 2)),
    createdAt: now,
    expiresAt,
  };

  if (post.note?.trim()) payload.note = post.note.trim();

  logger.debug('postService.createPost', 'Payload ready, writing to Firestore...');
  logger.debug('postService.createPost', 'Document ID will be:', id);

  try {
    await setDoc(doc(db, COLLECTION, id), payload);
    return id;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      throw new Error('Permission denied. Check Firestore rules.');
    }
    throw error;
  }
}

export async function getPostById(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(db, COLLECTION, postId));
  if (!snap.exists()) return null;
  return snapToPost(snap.id, snap.data());
}

/**
 * Fetch posts, optionally filtered by destination.
 * Only returns `open` posts that have not expired.
 */
export async function getPosts(destination?: string): Promise<Post[]> {
  const colRef = collection(db, COLLECTION);
  const now = Date.now();

  let q;
  if (destination) {
    q = query(
      colRef,
      where('destination', '==', destination),
      where('status', '==', 'open'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'desc'),
    );
  } else {
    q = query(
      colRef,
      where('status', '==', 'open'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'desc'),
    );
  }

  const snap: QuerySnapshot<DocumentData> = await getDocs(q);
  return snap.docs.map((d) => snapToPost(d.id, d.data()));
}

/**
 * Mark a user as interested in a post (adds uid to `interested` array).
 * Automatically marks the post as `matched` when it reaches capacity.
 */
export async function joinPost(postId: string, userId: string, joinerName?: string): Promise<void> {
  const ref = doc(db, COLLECTION, postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post not found');

  const data = snap.data() as Post;
  if (data.status !== 'open') throw new Error('Post is no longer open');
  if (data.interested.includes(userId)) throw new Error('Already joined this post');

  const isMatched = data.interested.length >= data.maxRiders - 1;
  await updateDoc(ref, {
    interested: arrayUnion(userId),
    ...(isMatched ? { status: 'matched' as PostStatus } : {}),
  });

  // Notify post owner in Firestore (in-app notification)
  if (data.authorId !== userId) {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      toUserId: data.authorId,
      fromUserId: userId,
      fromName: joinerName ?? 'Someone',
      type: isMatched ? 'post_matched' : 'post_joined',
      postId,
      destination: data.destination,
      message: isMatched
        ? `🎉 ${joinerName ?? 'Someone'} joined your ride to ${data.destination} — you're matched!`
        : `👋 ${joinerName ?? 'Someone'} wants to join your ride to ${data.destination}`,
      read: false,
      createdAt: Date.now(),
    });
  }
}

export async function leavePost(postId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post not found');

  const data = snap.data() as Post;
  if (!data.interested.includes(userId)) return;

  await updateDoc(ref, {
    interested: arrayRemove(userId),
    status: 'open' as PostStatus,
  });
}

/**
 * Soft-delete a post by marking its status as `cancelled`.
 * Actual Firestore deletion is reserved for admin cleanup jobs.
 */
export async function deletePost(postId: string): Promise<void> {
  const ref = doc(db, COLLECTION, postId);
  await updateDoc(ref, { status: 'cancelled' as PostStatus });
}

export async function cancelPost(postId: string, userId: string): Promise<void> {
  const post = await getPostById(postId);
  if (!post) throw new Error('Post not found');
  if (post.authorId !== userId) throw new Error('Only the author can cancel this post');
  await deletePost(postId);
}

/**
 * Real-time subscription to open posts for a given destination.
 * Returns an unsubscribe function.
 */
export function subscribeToDestinationPosts(
  destination: string,
  callback: (posts: Post[]) => void,
): () => void {
  const now = Date.now();
  const q = query(
    collection(db, COLLECTION),
    where('destination', '==', destination),
    where('status', '==', 'open'),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'asc'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => snapToPost(d.id, d.data())));
  });
}

export function subscribeToOpenPosts(callback: (posts: Post[]) => void): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', ['open', 'matched']),
    orderBy('createdAt', 'desc'),
  );

  const now = Date.now();
  return onSnapshot(q, (snap) => {
    const posts = snap.docs
      .map((d) => snapToPost(d.id, d.data()))
      .filter((p) => !p.expiresAt || p.expiresAt > now);
    callback(posts);
  }, (error) => {
    logger.error('postService.subscribeToOpenPosts', error.message);
    // Fallback: return empty so UI shows "No posts yet" instead of freezing
    callback([]);
  });
}
