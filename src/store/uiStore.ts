import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import type { MapStyleId } from '@/config/mapStyles';

interface UIState {
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  mapStyle: MapStyleId;
  setMapStyle: (style: MapStyleId) => void;
  loadMapStylePreference: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  toastMessage: null,
  showToast: (toastMessage) => set({ toastMessage }),
  hideToast: () => set({ toastMessage: null }),

  mapStyle: 'auto',
  setMapStyle: (mapStyle) => {
    set({ mapStyle });
    storage.set(STORAGE_KEYS.MAP_STYLE, mapStyle);
  },
  loadMapStylePreference: async () => {
    const saved = await storage.get<MapStyleId>(STORAGE_KEYS.MAP_STYLE);
    if (saved) set({ mapStyle: saved });
  },
}));
