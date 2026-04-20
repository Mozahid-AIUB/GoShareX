export interface User {
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
  badge: UserBadge;
  strikes: number;
  isSuspended: boolean;
  suspendedUntil?: number;
  createdAt: string;
  lastActive?: number;
}

export type UserBadge = 'New Rider' | 'Regular' | 'Trusted' | 'Elite Rider' | 'Unreliable';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  studentId: string;
  department?: string;
  phoneNumber?: string;
}

export interface ProfileSetupData {
  name: string;
  studentId: string;
  department?: string;
  phoneNumber?: string;
  photoURL?: string;
}
