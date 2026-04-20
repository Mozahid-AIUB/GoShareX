export type MessageType = 'text' | 'quick_reply' | 'deal_confirm' | 'system';

export interface Message {
  msgId: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: MessageType;
  read: boolean;
}

export interface Chat {
  chatId: string;
  participants: [string, string];
  rideId: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unreadCount: Record<string, number>;
  dealConfirmed: Record<string, boolean>;
  createdAt?: number;
}
