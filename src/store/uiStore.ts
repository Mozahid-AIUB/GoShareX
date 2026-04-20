import { create } from 'zustand';

interface UIState {
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toastMessage: null,
  showToast: (toastMessage) => set({ toastMessage }),
  hideToast: () => set({ toastMessage: null }),
}));
