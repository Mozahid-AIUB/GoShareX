import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speedKmh: number | null;
  isTracking: boolean;
}

interface LocationStore extends LocationState {
  setLocation: (lat: number, lng: number, accuracy: number, speedKmh?: number | null) => void;
  setTracking: (tracking: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  speedKmh: null,
  isTracking: false,

  setLocation: (lat, lng, accuracy, speedKmh = null) =>
    set({ latitude: lat, longitude: lng, accuracy, speedKmh }),

  setTracking: (tracking) =>
    set({ isTracking: tracking }),

  clearLocation: () =>
    set({ latitude: null, longitude: null, accuracy: null, speedKmh: null, isTracking: false }),
}));
