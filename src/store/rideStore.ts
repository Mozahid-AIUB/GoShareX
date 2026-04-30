import { create } from 'zustand';
import type { NearbyRider } from '@/types/ride.types';

export type RideRequestState = 'idle' | 'pending' | 'confirmed';
export type VehicleType = 'rickshaw' | 'cng' | 'bike';

export type { NearbyRider };

export const VEHICLE_CONFIG: Record<VehicleType, {
  label: string;
  iconType: 'rickshaw' | 'motorcycle' | 'cng';
  tone: 'amber' | 'indigo' | 'teal';
  fareMultiplier: number;
  maxPassengers: number;
  description: string;
}> = {
  rickshaw: { label: 'Rickshaw', iconType: 'rickshaw',   tone: 'amber',  fareMultiplier: 1.0, maxPassengers: 2, description: 'Eco-friendly, short trips' },
  bike:     { label: 'Bike',     iconType: 'motorcycle', tone: 'indigo', fareMultiplier: 0.7, maxPassengers: 1, description: 'Fastest, 1 rider only' },
  cng:      { label: 'CNG',      iconType: 'cng',        tone: 'teal',   fareMultiplier: 1.4, maxPassengers: 4, description: 'Comfortable, all routes' },
};

export type CustomDestination = {
  id: string; name: string; lat: number; lng: number;
  placeId?: string; address?: string;
};

interface RideState {
  currentRide: Record<string, unknown> | null;
  status: 'idle' | 'waiting' | 'matched' | 'active' | 'completed';
  partner: NearbyRider | null;
  destination: string | null;
  customDestination: CustomDestination | null;
  pickupPoint: string | null;
  vehicleType: VehicleType;
  passengerCount: number;
  routeSearchNonce: number;
  requestStates: Record<string, RideRequestState>;
  requestingPartner: NearbyRider | null;
  nearbyRiders: NearbyRider[];
}

interface RideStore extends RideState {
  setCurrentRide: (ride: Record<string, unknown>) => void;
  setStatus: (status: RideState['status']) => void;
  setPartner: (partner: NearbyRider) => void;
  setDestination: (destination: string) => void;
  setCustomDestination: (destination: CustomDestination | null) => void;
  setPickupPoint: (pickup: string) => void;
  setVehicleType: (vehicle: VehicleType) => void;
  setPassengerCount: (count: number) => void;
  triggerRouteSearch: () => void;
  setRequestState: (partnerId: string, requestState: RideRequestState) => void;
  clearRequestState: (partnerId: string) => void;
  setRequestingPartner: (partner: NearbyRider | null) => void;
  setNearbyRiders: (riders: NearbyRider[]) => void;
  clearRide: () => void;
  readonly selectedDestination: string | null;
  readonly selectedPickup: string | null;
}

export const useRideStore = create<RideStore>((set, get) => ({
  currentRide: null,
  status: 'idle',
  partner: null,
  destination: null,
  customDestination: null,
  pickupPoint: null,
  vehicleType: 'rickshaw',
  passengerCount: 2,
  routeSearchNonce: 0,
  requestStates: {},
  requestingPartner: null,
  nearbyRiders: [],

  get selectedDestination() { return get().destination; },
  get selectedPickup() { return get().pickupPoint; },

  setCurrentRide: (ride) => set({ currentRide: ride }),
  setStatus: (status) => set({ status }),
  setPartner: (partner) => set({ partner }),
  setDestination: (destination) => set({ destination }),
  setCustomDestination: (customDestination) => set({ customDestination }),
  setPickupPoint: (pickup) => set({ pickupPoint: pickup }),
  setVehicleType: (vehicleType) => set({ vehicleType }),
  setPassengerCount: (passengerCount) => set({ passengerCount }),
  triggerRouteSearch: () => set((state) => ({ routeSearchNonce: state.routeSearchNonce + 1 })),
  setRequestState: (partnerId, requestState) =>
    set((state) => ({ requestStates: { ...state.requestStates, [partnerId]: requestState } })),
  clearRequestState: (partnerId) =>
    set((state) => {
      const nextStates = { ...state.requestStates };
      delete nextStates[partnerId];
      return { requestStates: nextStates };
    }),
  setRequestingPartner: (partner) => set({ requestingPartner: partner }),
  setNearbyRiders: (riders) => set({ nearbyRiders: riders }),
  clearRide: () => set({
    currentRide: null, status: 'idle', partner: null,
    destination: null, customDestination: null, pickupPoint: null,
    vehicleType: 'rickshaw', passengerCount: 2, routeSearchNonce: 0,
    requestStates: {}, requestingPartner: null, nearbyRiders: [],
  }),
}));