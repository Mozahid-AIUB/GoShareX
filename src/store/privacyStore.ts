/**
 * privacyStore — Per-device chat privacy preferences.
 *
 * Stored in AsyncStorage (not synced across devices). Defaults to most
 * useful: everything on.
 *
 * Used by:
 * - ChatScreen: gates `setTyping` / `markRead` calls based on user preference
 * - presenceService: skipped at App.tsx level if showOnlineStatus is off
 */

import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export type PrivacyPrefs = {
  showOnlineStatus: boolean;
  sendReadReceipts: boolean;
  showTypingIndicator: boolean;
};

const DEFAULTS: PrivacyPrefs = {
  showOnlineStatus: true,
  sendReadReceipts: true,
  showTypingIndicator: true,
};

interface PrivacyState extends PrivacyPrefs {
  setShowOnlineStatus: (v: boolean) => void;
  setSendReadReceipts: (v: boolean) => void;
  setShowTypingIndicator: (v: boolean) => void;
  load: () => Promise<void>;
}

function persist(state: PrivacyPrefs) {
  storage.set(STORAGE_KEYS.PRIVACY_PREFS, state);
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  ...DEFAULTS,
  setShowOnlineStatus: (showOnlineStatus) => {
    set({ showOnlineStatus });
    const { sendReadReceipts, showTypingIndicator } = get();
    persist({ showOnlineStatus, sendReadReceipts, showTypingIndicator });
  },
  setSendReadReceipts: (sendReadReceipts) => {
    set({ sendReadReceipts });
    const { showOnlineStatus, showTypingIndicator } = get();
    persist({ showOnlineStatus, sendReadReceipts, showTypingIndicator });
  },
  setShowTypingIndicator: (showTypingIndicator) => {
    set({ showTypingIndicator });
    const { showOnlineStatus, sendReadReceipts } = get();
    persist({ showOnlineStatus, sendReadReceipts, showTypingIndicator });
  },
  load: async () => {
    const saved = await storage.get<PrivacyPrefs>(STORAGE_KEYS.PRIVACY_PREFS);
    if (saved) set(saved);
  },
}));
