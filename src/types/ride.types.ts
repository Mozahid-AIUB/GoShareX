export type RideStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface RideRoutePreview {
  distanceMeters: number;
  durationSeconds: number;
  durationText: string;
  soloFare: number;
  splitFare: number;
  encodedPolyline?: string;
  pricingSource: 'routes_api' | 'fare_table';
}

export interface Ride {
  rideId: string;
  rider1: string;
  rider2: string;
  destination: string;
  pickupPoint: string;
  fare: number;
  splitAmount: number;
  status: RideStatus;
  routePreview?: RideRoutePreview;
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
  // গন্তব্যের coordinate — Uber-style auto-complete geofence-এ লাগে (custom
  // গন্তব্যেও কাজ করাতে; নাম দিয়ে preset resolve-এর দরকার পড়ে না)।
  destLat?: number;
  destLng?: number;
  pickupPoint: string;
  rating: number;
  badge: string;
  photoURL?: string;
  lat: number;
  lng: number;
  isMatch: boolean;
  // premium smart-matching (server PostGIS nearby_riders RPC থেকে):
  matchScore?: number;        // 0–100, দিক/পথ-সচেতন match quality
  headingDiffDeg?: number;    // চলার দিকের পার্থক্য (0–180°; ছোট = একই দিক)
  destGapM?: number;          // দুই গন্তব্যের দূরত্ব (মিটার)
  corridorM?: number;         // আমার সোজা পথ থেকে তার দূরত্ব (মিটার)
  department?: string;
  vehicleType?: 'rickshaw' | 'cng' | 'bike';
}
