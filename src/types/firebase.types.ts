import { Timestamp } from 'firebase/firestore';

export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  department?: string;
  phoneNumber?: string;
  photoURL?: string;
  rating: number;
  totalRides: number;
  totalSaved: number;
  completionRate: number;
  badge: string;
  strikes: number;
  isSuspended: boolean;
  suspendedUntil?: Timestamp;
  createdAt: Timestamp;
  lastActive?: Timestamp;
}

export interface FirebaseActiveRider {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  destination: string;
  pickupPoint: string;
  status: 'waiting' | 'matched' | 'in_ride';
  timestamp: Timestamp;
  rating: number;
  badge: string;
  photoURL?: string;
}

export interface FirebaseRide {
  rideId: string;
  rider1: string;
  rider2: string;
  destination: string;
  pickupPoint: string;
  fare: number;
  splitAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  confirmedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelReason?: string;
  rider1Rating?: number;
  rider2Rating?: number;
  rider1Feedback?: string;
  rider2Feedback?: string;
}

export interface FirebaseMessage {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'location' | 'quick_reply';
  read: boolean;
}

export interface FirebaseChat {
  chatId: string;
  participants: string[];
  rideId?: string;
  lastMessage?: FirebaseMessage;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebasePost {
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  destination: string;
  pickupPoint: string;
  scheduledTime: 'now' | number;
  note?: string;
  status: 'open' | 'matched' | 'expired' | 'cancelled';
  interested: string[];
  maxRiders: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
