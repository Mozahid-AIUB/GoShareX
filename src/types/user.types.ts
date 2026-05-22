export type UserBadge = 'New Rider' | 'Regular' | 'Trusted' | 'Elite Rider' | 'Unreliable';

export interface User {
  uid: string;
  name: string;
  email: string;
  studentId: string;
  department?: string;
  photoURL?: string;
  rating: number;
  ratingCount?: number;
  trustScore?: number;
  totalRides: number;
  totalSaved: number;
  completionRate: number;
  badge: UserBadge;
  strikes: number;
  isSuspended: boolean;
  suspendedUntil?: number;
  phoneNumber?: string;
  defaultPickupPoint?: string;
  createdAt: number;
}

export interface ActiveRider {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  destination: string;
  pickupPoint: string;
  status: 'waiting' | 'matched' | 'riding';
  timestamp: number;
  rating: number;
  badge: UserBadge;
  photoURL?: string;
  distanceMeters?: number;
}
