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

const COLLECTION = 'posts';

export interface PostData {
  authorId: string;
  authorName: string;
  authorRating: number;
  authorBadge: string;
  authorPhotoURL?: string;
  destination: string;
  pickupPoint: string;
  scheduledTime: 'now' | string;
  note?: string;
  maxRiders?: number;
}

export interface CreatePostInput extends PostData {}

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
    pickupPoint: data.pickupPoint,
    scheduledTime: data.scheduledTime,
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
  const id = doc(collection(db, COLLECTION)).id;
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes

  await setDoc(doc(db, COLLECTION, id), {
    ...post,
    postId: id,
    status: 'open' as PostStatus,
    interested: [],
    maxRiders: post.maxRiders ?? 2,
    createdAt: now,
    expiresAt,
  });

  return id;
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
export async function joinPost(postId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION, postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post not found');

  const data = snap.data() as Post;
  if (data.status !== 'open') throw new Error('Post is no longer open');
  if (data.interested.includes(userId)) throw new Error('Already joined this post');
  if (data.interested.length >= data.maxRiders - 1) {
    // Reaching capacity — mark as matched
    await updateDoc(ref, {
      interested: arrayUnion(userId),
      status: 'matched' as PostStatus,
    });
  } else {
    await updateDoc(ref, {
      interested: arrayUnion(userId),
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
  const now = Date.now();
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'open'),
    where('expiresAt', '>', now),
    orderBy('expiresAt', 'asc'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => snapToPost(d.id, d.data())));
  });
}
