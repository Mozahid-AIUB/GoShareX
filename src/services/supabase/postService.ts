// ============================================================
// Supabase Post Service
// Firebase postService এর সমতুল্য (board screen যা ডাকে): createPost,
// subscribeToOpenPosts, joinPost, leavePost, cancelPost, deletePost,
// getPostById, getPosts। posts টেবিল + Realtime।
// ============================================================
import { supabase } from '@/config/supabase.config';
import type { Post, PostStatus } from '@/types';
import { logger } from '@/utils/logger';

export interface PostData {
  authorId: string;
  authorName: string;
  authorRating?: number;
  authorBadge?: string;
  authorPhotoURL?: string | null;
  destination: string;
  meetPoint: string;
  meetTime?: string;
  rideType?: 'share' | 'bike_owner';
  note?: string | null;
  maxRiders?: number;
}

function rowToPost(row: any): Post {
  return {
    postId: row.id,
    authorId: row.author_id,
    authorName: row.author_name ?? '',
    authorRating: Number(row.author_rating ?? 0),
    authorBadge: row.author_badge ?? 'New Rider',
    authorPhotoURL: row.author_photo_url ?? null,
    destination: row.destination,
    meetPoint: row.meet_point ?? row.pickup_point ?? '',
    meetTime: row.meet_time ?? undefined,
    scheduledTime: row.scheduled_time_text ?? 'Now',
    rideType: row.ride_type ?? 'share',
    note: row.note ?? undefined,
    status: row.status as PostStatus,
    interested: row.interested ?? [],
    maxRiders: row.max_riders ?? 2,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : Date.now(),
  };
}

export async function createPost(post: PostData): Promise<string> {
  if (!post.authorId?.trim()) throw new Error('Author ID is required');
  if (!post.destination?.trim()) throw new Error('Destination is required');
  if (!post.meetPoint?.trim()) throw new Error('Meeting point is required');

  const now = Date.now();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: post.authorId,
      author_name: post.authorName.trim(),
      author_rating: post.authorRating ?? 0,
      author_badge: post.authorBadge ?? 'New Rider',
      author_photo_url: post.authorPhotoURL ?? null,
      destination: post.destination.trim(),
      pickup_point: post.meetPoint.trim(),  // টেবিলের NOT NULL
      meet_point: post.meetPoint.trim(),
      meet_time: post.meetTime?.trim() || null,
      scheduled_time_text: post.meetTime?.trim() || 'Now',
      ride_type: post.rideType ?? 'share',
      note: post.note?.trim() || null,
      status: 'open',
      interested: [],
      max_riders: Math.max(2, Math.min(4, post.maxRiders ?? 2)),
      expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(), // 24h
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('supabasePostService.create', error);
    throw new Error(error?.message ?? 'Could not create post.');
  }
  return data.id;
}

export async function getPostById(postId: string): Promise<Post | null> {
  const { data } = await supabase.from('posts').select('*').eq('id', postId).single();
  return data ? rowToPost(data) : null;
}

export async function getPosts(destination?: string): Promise<Post[]> {
  let q = supabase.from('posts').select('*').eq('status', 'open');
  if (destination) q = q.eq('destination', destination);
  const { data } = await q.order('created_at', { ascending: false });
  return (data ?? []).map(rowToPost);
}

export async function joinPost(postId: string, userId: string, joinerName?: string): Promise<void> {
  // post-এর তথ্য আনি (author, capacity, destination — notification-এর জন্য)
  const { data: post, error: readErr } = await supabase
    .from('posts')
    .select('author_id, destination, max_riders, interested, status')
    .eq('id', postId)
    .single();
  if (readErr) throw readErr;
  if (!post) throw new Error('Post not found');
  if (post.status !== 'open') throw new Error('Post is no longer open');

  const current: string[] = post.interested ?? [];
  if (current.includes(userId)) return;

  // capacity পূর্ণ হলে post matched (Firebase-এর মতো: interested >= max-1)
  const isMatched = current.length >= (post.max_riders ?? 2) - 1;
  const { error } = await supabase
    .from('posts')
    .update({
      interested: [...current, userId],
      ...(isMatched ? { status: 'matched' as PostStatus } : {}),
    })
    .eq('id', postId);
  if (error) throw error;

  // post owner-কে in-app notification (Firebase joinPost এর সমতুল্য)।
  // নিজের post-এ join করলে notify করি না।
  if (post.author_id && post.author_id !== userId) {
    const { error: notifErr } = await supabase.from('notifications').insert({
      to_user_id: post.author_id,
      from_user_id: userId,
      type: isMatched ? 'post_matched' : 'post_joined',
      message: isMatched
        ? `🎉 ${joinerName ?? 'Someone'} joined your ride to ${post.destination} — you're matched!`
        : `👋 ${joinerName ?? 'Someone'} wants to join your ride to ${post.destination}`,
      data: { postId, destination: post.destination },
      read: false,
    });
    // notification fail করলে join আটকাই না (best-effort) — শুধু log।
    if (notifErr) logger.warn('post.joinPost.notify', notifErr.message);
  }
}

export async function leavePost(postId: string, userId: string): Promise<void> {
  const { data } = await supabase.from('posts').select('interested').eq('id', postId).single();
  const current: string[] = data?.interested ?? [];
  const { error } = await supabase
    .from('posts')
    .update({ interested: current.filter((u) => u !== userId) })
    .eq('id', postId);
  if (error) throw error;
}

export async function cancelPost(postId: string, _userId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ status: 'cancelled' })
    .eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  await supabase.from('posts').delete().eq('id', postId);
}

/** open post তালিকা real-time subscribe (Firebase subscribeToOpenPosts এর সমতুল্য)। */
export function subscribeToOpenPosts(callback: (posts: Post[]) => void): () => void {
  const load = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    callback((data ?? []).map(rowToPost));
  };
  void load();

  // unique channel নাম — একাধিক subscribe (refresh) conflict এড়াতে।
  const channel = supabase
    .channel(`posts_open_${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** নির্দিষ্ট destination-এর post real-time (Firebase subscribeToDestinationPosts)। */
export function subscribeToDestinationPosts(
  destination: string,
  callback: (posts: Post[]) => void,
): () => void {
  const load = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'open')
      .eq('destination', destination)
      .order('created_at', { ascending: false });
    callback((data ?? []).map(rowToPost));
  };
  void load();

  const channel = supabase
    .channel(`posts_dest_${destination}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
