import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/config/supabase.config';
import { Post, PostStatus } from '@/types';
import { useAuthStore } from '@/store';
import { logger } from '@/utils/logger';

// firebase usePostBoard-এর Supabase যমজ — একই interface।
// posts টেবিলে real-time subscription + create + join।

type PostFilter = 'all' | PostStatus;

interface CreatePostParams {
  destination: string;
  meetPoint: string;
  scheduledTime: 'now' | string;
  note?: string;
  maxRiders?: number;
}

interface UsePostBoardResult {
  posts: Post[];
  myPost: Post | null;
  isLoading: boolean;
  filter: PostFilter;
  setFilter: (f: PostFilter) => void;
  fetchPosts: () => void;
  createPost: (params: CreatePostParams) => Promise<string | null>;
  joinPost: (postId: string) => Promise<boolean>;
}

const POST_EXPIRE_MINUTES = 30;

// posts row (snake) -> Post (camel)
function rowToPost(row: any): Post {
  return {
    postId: row.id,
    authorId: row.author_id,
    authorName: row.author_name ?? '',
    authorRating: Number(row.author_rating ?? 5),
    authorBadge: row.author_badge ?? '',
    authorPhotoURL: row.author_photo_url ?? null,
    destination: row.destination,
    meetPoint: row.meet_point ?? row.pickup_point ?? '',
    meetTime: row.meet_time ?? undefined,
    scheduledTime: row.scheduled_time_text ?? 'now',
    rideType: row.ride_type ?? 'share',
    note: row.note ?? undefined,
    status: row.status as PostStatus,
    interested: row.interested ?? [],
    maxRiders: row.max_riders ?? 2,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : Date.now(),
  };
}

export function useSupabasePostBoard(): UsePostBoardResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPost, setMyPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PostFilter>('all');
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('useSupabasePostBoard.load', error);
      setIsLoading(false);
      return;
    }
    const all = (data ?? []).map(rowToPost);
    const filtered = filter === 'all' ? all : all.filter((p) => p.status === filter);
    setPosts(filtered);
    setMyPost(all.find((p) => p.authorId === user?.uid) ?? null);
    setIsLoading(false);
  }, [filter, user?.uid]);

  const fetchPosts = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setIsLoading(true);
    void load();

    // real-time: posts-এ যেকোনো পরিবর্তন হলে আবার লোড
    const channel = supabase
      .channel('posts_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () =>
        void load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const createPost = useCallback(
    async (params: CreatePostParams): Promise<string | null> => {
      if (!user) return null;
      try {
        const now = Date.now();
        const { data, error } = await supabase
          .from('posts')
          .insert({
            author_id: user.uid,
            author_name: user.name,
            author_rating: user.rating,
            author_badge: user.badge,
            author_photo_url: user.photoURL ?? null,
            destination: params.destination,
            pickup_point: params.meetPoint,   // টেবিলের NOT NULL pickup_point
            meet_point: params.meetPoint,
            scheduled_time_text: params.scheduledTime,
            note: params.note ?? null,
            status: 'open',
            interested: [],
            max_riders: params.maxRiders ?? 2,
            expires_at: new Date(now + POST_EXPIRE_MINUTES * 60 * 1000).toISOString(),
          })
          .select('id')
          .single();
        if (error || !data) throw error;
        return data.id;
      } catch (err) {
        logger.error('useSupabasePostBoard.createPost', err);
        return null;
      }
    },
    [user],
  );

  const joinPost = useCallback(
    async (postId: string): Promise<boolean> => {
      if (!user) return false;
      try {
        // interested array-তে নিজেকে যোগ (ডুপ্লিকেট এড়িয়ে)
        const { data: row } = await supabase
          .from('posts')
          .select('interested')
          .eq('id', postId)
          .single();
        const current: string[] = row?.interested ?? [];
        if (current.includes(user.uid)) return true;
        const { error } = await supabase
          .from('posts')
          .update({ interested: [...current, user.uid] })
          .eq('id', postId);
        if (error) throw error;
        return true;
      } catch (err) {
        logger.error('useSupabasePostBoard.joinPost', err);
        return false;
      }
    },
    [user],
  );

  return { posts, myPost, isLoading, filter, setFilter, fetchPosts, createPost, joinPost };
}
