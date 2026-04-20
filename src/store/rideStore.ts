import { create } from 'zustand';

interface RideState {
  currentRide: any | null;
  status: 'idle' | 'waiting' | 'matched' | 'active' | 'completed';
  partner: any | null;
  // canonical names
  destination: string | null;
  pickupPoint: string | null;
}

interface RideStore extends RideState {
  // canonical fields
  setCurrentRide: (ride: any) => void;
  setStatus: (status: RideState['status']) => void;
  setPartner: (partner: any) => void;
  setDestination: (destination: string) => void;
  setPickupPoint: (pickup: string) => void;
  nearbyRiders: any[];
  setNearbyRiders: (riders: any[]) => void;
  clearRide: () => void;

  // aliases used by HomeScreen (src/screens/main/HomeScreen & src/screens/home/HomeScreen)
  readonly selectedDestination: string | null;
  readonly selectedPickup: string | null;
}

export const useRideStore = create<RideStore>((set, get) => ({
  currentRide: null,
  status: 'idle',
  partner: null,
  destination: null,
  pickupPoint: null,
  nearbyRiders: [],

  // Computed aliases — read-through to canonical state
  get selectedDestination() { return get().destination; },
  get selectedPickup() { return get().pickupPoint; },

  setCurrentRide: (ride) => set({ currentRide: ride }),
  setStatus: (status) => set({ status }),
  setPartner: (partner) => set({ partner }),
  setDestination: (destination) => set({ destination }),
  setPickupPoint: (pickup) => set({ pickupPoint: pickup }),
  setNearbyRiders: (riders) => set({ nearbyRiders: riders }),

  clearRide: () =>
    set({
      currentRide: null,
      status: 'idle',
      partner: null,
      destination: null,
      pickupPoint: null,
      nearbyRiders: [],
    }),
}));
