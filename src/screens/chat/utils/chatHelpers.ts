/**
 * chatHelpers — Pure helpers + constants shared across chat screens.
 */

export const SEARCH_TIMEOUT_MS = 30_000;

export const QUICK_REPLIES = [
  { id: 'salam', text: 'Assalamu Alaikum' },
  { id: 'coming', text: 'On my way' },
  { id: 'wait', text: 'Please wait' },
  { id: 'where', text: 'Where are you?' },
  { id: 'cancel', text: 'Need to cancel' },
] as const;

/** Minutes remaining until an expiry timestamp (rounded up). */
export const minutesLeft = (expiresAt?: number): number | null => {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000));
};

/** Format milliseconds as MM:SS countdown. */
export const formatCountdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export interface ChatItem {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAliases?: Record<string, string>;
  destination: string;
  fare: number;
  mode?: 'ride' | 'anonymous_1v1' | 'anonymous_group';
  anonymous?: boolean;
  expiresAt?: number;
  closedAt?: number;
  searching?: boolean;
  lastMessage: string;
  lastMessageTime: number;
  dealConfirmed: Record<string, boolean>;
}

export interface GroupRoom {
  id: string;
  participants: string[];
  expiresAt?: number;
}
