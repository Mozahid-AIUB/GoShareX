import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isTracking: boolean;
}

interface LocationStore extends LocationState {
  setLocation: (lat: number, lng: number, accuracy: number) => void;
  setTracking: (tracking: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  isTracking: false,
  
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
