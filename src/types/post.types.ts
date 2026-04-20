export type PostStatus = 'open' | 'matched' | 'expired' | 'cancelled';

export interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  authorRating: number;
  authorBadge: string;
  authorPhotoURL?: string;
  destination: string;
  pickupPoint: string;
  scheduledTime: 'now' | string;
  note?: string;
  status: PostStatus;
  interested: string[];
  maxRiders: number;
  createdAt: number;
  expiresAt: number;
}
