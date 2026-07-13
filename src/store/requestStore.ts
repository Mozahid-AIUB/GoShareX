// ============================================================
// Request Store — app-wide incoming ride requests।
//
// আগে incoming request listener শুধু HomeScreen-এ ছিল → অন্য screen-এ
// (Map/Chat/Profile) গেলে banner আসত না। এখন AppNavigator একবার listener
// চালায়, এই store-এ রাখে; global overlay যেকোনো screen-এ banner দেখায়।
// ============================================================
import { create } from 'zustand';
import type { RideRequest } from '@/services/supabase/rideRequestService';

interface RequestState {
  incoming: RideRequest[];
  setIncoming: (reqs: RideRequest[]) => void;
  clear: () => void;
}

export const useRequestStore = create<RequestState>((set) => ({
  incoming: [],
  setIncoming: (incoming) => set({ incoming }),
  clear: () => set({ incoming: [] }),
}));
