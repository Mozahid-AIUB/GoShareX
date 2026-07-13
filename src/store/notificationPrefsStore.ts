/**
 * notificationPrefsStore — per-device notification preferences (Settings
 * toggles)।
 *
 * AsyncStorage-এ রাখা (device-ভিত্তিক, sync হয় না)। আগে SettingsScreen-এর
 * toggle গুলো শুধু useState ছিল — app বন্ধ হলে reset হত। এই store সেগুলো
 * persist করে। gating (toggle off → notification বন্ধ) পরের ধাপে যোগ হবে।
 *
 * pattern: privacyStore-এর সমান (set + persist + load on app start)।
 * (নাম "...Prefs" — পুরোনো notificationStore.ts pending-payload-এর জন্য, ভিন্ন।)
 */

import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export type NotificationPrefs = {
  notifRides: boolean;  // ride request alert
  notifChat: boolean;   // chat message alert
};

const DEFAULTS: NotificationPrefs = {
  notifRides: true,
  notifChat: true,
};

interface NotificationPrefsState extends NotificationPrefs {
  setNotifRides: (v: boolean) => void;
  setNotifChat: (v: boolean) => void;
  load: () => Promise<void>;
}

function persist(state: NotificationPrefs) {
  storage.set(STORAGE_KEYS.NOTIFICATION_PREFS, state);
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  ...DEFAULTS,
  setNotifRides: (notifRides) => {
    set({ notifRides });
    const { notifChat } = get();
    persist({ notifRides, notifChat });
  },
  setNotifChat: (notifChat) => {
    set({ notifChat });
    const { notifRides } = get();
    persist({ notifRides, notifChat });
  },
  load: async () => {
    const saved = await storage.get<NotificationPrefs>(STORAGE_KEYS.NOTIFICATION_PREFS);
    if (saved) set(saved);
  },
}));
