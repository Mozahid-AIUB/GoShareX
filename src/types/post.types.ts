export type PostStatus = 'open' | 'matched' | 'expired' | 'cancelled';
export type RideType = 'share' | 'bike_owner';

export interface Post {
  postId: string;
  authorId: string;
  authorName: string;
  authorRating: number;
  authorBadge: string;
  authorPhotoURL?: string | null;
  destination: string;
  meetPoint: string;
  meetTime: string;       // exact time e.g. "12:05"
  scheduledTime: string;  // kept for backward compat
  rideType: RideType;     // 'share' | 'bike_owner'
  note?: string;
  status: PostStatus;
  interested: string[];
  maxRiders: number;
  createdAt: number;
  expiresAt: number;
}
