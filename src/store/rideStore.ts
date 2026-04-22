import { create } from 'zustand';

export type RideRequestState = 'idle' | 'pending' | 'confirmed';

interface RideState {
  currentRide: any | null;
  status: 'idle' | 'waiting' | 'matched' | 'active' | 'completed';
  partner: any | null;
  // canonical names
  destination: string | null;
  pickupPoint: string | null;
  requestStates: Record<string, RideRequestState>;
  requestingPartner: any | null;
}

interface RideStore extends RideState {
  // canonical fields
  setCurrentRide: (ride: any) => void;
  setStatus: (status: RideState['status']) => void;
  setPartner: (partner: any) => void;
  setDestination: (destination: string) => void;
  setPickupPoint: (pickup: string) => void;
  setRequestState: (partnerId: string, requestState: RideRequestState) => void;
  clearRequestState: (partnerId: string) => void;
  setRequestingPartner: (partner: any | null) => void;
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
  requestStates: {},
  requestingPartner: null,
  nearbyRiders: [],

  // Computed aliases — read-through to canonical state
  get selectedDestination() { return get().destination; },
  get selectedPickup() { return get().pickupPoint; },

  setCurrentRide: (ride) => set({ currentRide: ride }),
  setStatus: (status) => set({ status }),
  setPartner: (partner) => set({ partner }),
  setDestination: (destination) => set({ destination }),
  setPickupPoint: (pickup) => set({ pickupPoint: pickup }),
  setRequestState: (partnerId, requestState) =>
    set((state) => ({
      requestStates: {
        ...state.requestStates,
        [partnerId]: requestState,
      },
    })),
  clearRequestState: (partnerId) =>
    set((state) => {
      const nextStates = { ...state.requestStates };
      delete nextStates[partnerId];
      return { requestStates: nextStates };
    }),
  setRequestingPartner: (partner) => set({ requestingPartner: partner }),
  setNearbyRiders: (riders) => set({ nearbyRiders: riders }),

  clearRide: () =>
    set({
      currentRide: null,
      status: 'idle',
      partner: null,
      destination: null,
      pickupPoint: null,
      requestStates: {},
      requestingPartner: null,
      nearbyRiders: [],
    }),
}));
