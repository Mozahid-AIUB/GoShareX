import { create } from 'zustand';

interface RideState {
  currentRide: any | null;
  status: 'idle' | 'waiting' | 'matched' | 'active' | 'completed';
  partner: any | null;
  destination: string | null;
  pickupPoint: string | null;
}

interface RideStore extends RideState {
  setCurrentRide: (ride: any) => void;
  setStatus: (status: RideState['status']) => void;
  setPartner: (partner: any) => void;
  setDestination: (destination: string) => void;
  setPickupPoint: (pickup: string) => void;
  clearRide: () => void;
}

export const useRideStore = create<RideStore>((set) => ({
  currentRide: null,
  status: 'idle',
  partner: null,
  destination: null,
  pickupPoint: null,
  
  setCurrentRide: (ride) => set({ currentRide: ride }),
  setStatus: (status) => set({ status }),
  setPartner: (partner) => set({ partner }),
  setDestination: (destination) => set({ destination }),
  setPickupPoint: (pickup) => set({ pickupPoint: pickup }),
  
  clearRide: () =>
    set({
      currentRide: null,
      status: 'idle',
      partner: null,
      destination: null,
      pickupPoint: null,
    }),
}));
