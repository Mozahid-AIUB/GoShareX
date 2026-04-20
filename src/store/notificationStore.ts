import { create } from 'zustand';
import type { PushPayload } from '@/types';

interface NotificationState {
  pending: PushPayload | null;
  setPending: (payload: PushPayload | null) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));
