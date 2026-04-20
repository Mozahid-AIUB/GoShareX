import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isTracking: boolean;
}

interface LocationStore extends LocationState {
  readonly lat: number | null;
  readonly lng: number | null;
  setLocation: (lat: number, lng: number, accuracy: number) => void;
  setTracking: (tracking: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  isTracking: false,
  get lat() {
    return this.latitude;
  },
  get lng() {
    return this.longitude;
  },
  
  setLocation: (lat, lng, accuracy) =>
    set({
      latitude: lat,
      longitude: lng,
      accuracy,
    }),
  
  setTracking: (tracking) =>
    set({ isTracking: tracking }),
  
  clearLocation: () =>
    set({
      latitude: null,
      longitude: null,
      accuracy: null,
      isTracking: false,
    }),
}));
