import { useCallback, useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Post, PostStatus } from '@/types';
import { useAuthStore } from '@/store';
import { handleError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

type PostFilter = 'all' | PostStatus;

interface CreatePostParams {
  destination: string;
  pickupPoint: string;
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

const POSTS_COLLECTION = 'posts';
const POST_EXPIRE_MINUTES = 30;

/**
 * Manages post board state with real-time Firestore subscription.
 */
export function usePostBoard(): UsePostBoardResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPost, setMyPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PostFilter>('all');

  const { user } = useAuthStore();

  const fetchPosts = useCallback(() => {
    setIsLoading(true);

    const query = firestore()
      .collection(POSTS_COLLECTION)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc');

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const fetched: Post[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as Post),
          postId: doc.id,
        }));

        const filtered =
          filter === 'all' ? fetched : fetched.filter((p) => p.status === filter);

        setPosts(filtered);
        setMyPost(fetched.find((p) => p.authorId === user?.uid) ?? null);
        setIsLoading(false);
      },
      (err) => {
        logger.error('usePostBoard.fetchPosts', err);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [filter, user?.uid]);

  useEffect(() => {
    const unsubscribe = fetchPosts();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchPosts]);

  const createPost = useCallback(
    async (params: CreatePostParams): Promise<string | null> => {
      if (!user) return null;

      try {
        const now = Date.now();
        const newPost: Omit<Post, 'postId'> = {
          authorId: user.uid,
          authorName: user.name,
          authorRating: user.rating,
          authorBadge: user.badge,
          authorPhotoURL: user.photoURL,
          destination: params.destination,
          pickupPoint: params.pickupPoint,
          scheduledTime: params.scheduledTime,
          note: params.note,
          status: 'open',
          interested: [],
          maxRiders: params.maxRiders ?? 2,
          createdAt: now,
          expiresAt: now + POST_EXPIRE_MINUTES * 60 * 1000,
        };

        const ref = await firestore().collection(POSTS_COLLECTION).add(newPost);
        logger.info('usePostBoard', `Post created: ${ref.id}`);
        return ref.id;
      } catch (err) {
        logger.error('usePostBoard.createPost', err);
        return null;
      }
    },
    [user],
  );

  const joinPost = useCallback(
    async (postId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        await firestore()
          .collection(POSTS_COLLECTION)
          .doc(postId)
          .update({
            interested: firestore.FieldValue.arrayUnion(user.uid),
          });
        logger.info('usePostBoard', `Joined post ${postId}`);
        return true;
      } catch (err) {
        logger.error('usePostBoard.joinPost', err);
        handleError(err);
        return false;
      }
    },
    [user],
  );

  return {
    posts,
    myPost,
    isLoading,
    filter,
    setFilter,
    fetchPosts,
    createPost,
    joinPost,
  };
}
