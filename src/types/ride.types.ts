export type RideStatus =
  | 'pending'
  | 'confirmed'
  | 'started'
  | 'completed'
  | 'cancelled';

export interface Ride {
  rideId: string;
  rider1: string;
  rider2: string;
  destination: string;
  pickupPoint: string;
  fare: number;
  splitAmount: number;
  status: RideStatus;
  confirmedAt?: number;
  startedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
  rider1Rating?: number;
  rider2Rating?: number;
  rider1Feedback?: string;
  rider2Feedback?: string;
}

export interface FareEntry {
  pickup: string;
  destination: string;
  fare: number;
}

export interface NearbyRider {
  uid: string;
  name: string;
  distance: number;
  destination: string;
  pickupPoint: string;
  rating: number;
  badge: string;
  photoURL?: string;
  lat: number;
  lng: number;
  isMatch: boolean;
}
