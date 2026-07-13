// ============================================================
// Supabase Chat — shared types
// Firebase chatService-এর Chat/Message/ChatMode এর সাথে মিল রেখে।
// ============================================================

export type ChatMode = 'ride' | 'anonymous_1v1' | 'anonymous_group';

export type MessageType = 'text' | 'quick_reply' | 'location' | 'system' | 'deal_confirm';

export interface ChatMessage {
  id: string;
  senderId: string | null;       // system message-এ null হতে পারে
  senderName: string;
  text: string;
  timestamp: number;
  type: MessageType;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAliases?: Record<string, string>;
  rideId?: string | null;
  destination: string;
  fare: number;
  mode: ChatMode;
  anonymous: boolean;
  expiresAt?: number;
  searching?: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  closedAt?: number;
  closedBy?: string;
  dealConfirmed?: Record<string, boolean>;
  lastRead?: Record<string, number>;
  typing?: Record<string, { alias: string; at: number } | null>;
}

// chat lifetime constants (Firebase chatService-এর মতোই)
export const RIDE_CHAT_DURATION_MS = 10 * 60 * 1000;
export const ANON_1V1_DURATION_MS = 5 * 60 * 1000;
export const ANON_GROUP_DURATION_MS = 10 * 60 * 1000;

export const ANON_GROUP_MIN_PARTICIPANTS = 2;
export const ANON_GROUP_MAX_PARTICIPANTS = 10;
