// ============================================================
// Post Service Router — flag অনুযায়ী Firebase বা Supabase।
// board screen এখান থেকে post function গুলো নেবে।
// ============================================================
import { FEATURE_FLAGS } from '@/config/featureFlags';
import * as fb from '@/services/firebase/postService';
import * as sb from '@/services/supabase/postService';

const impl = FEATURE_FLAGS.USE_SUPABASE_POSTS ? sb : fb;

export const createPost = impl.createPost;
export const getPostById = impl.getPostById;
export const getPosts = impl.getPosts;
export const joinPost = impl.joinPost;
export const leavePost = impl.leavePost;
export const cancelPost = impl.cancelPost;
export const deletePost = impl.deletePost;
export const subscribeToOpenPosts = impl.subscribeToOpenPosts;
export const subscribeToDestinationPosts = impl.subscribeToDestinationPosts;
