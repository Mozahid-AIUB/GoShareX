/**
 * messageService.ts
 * Pure utility functions for formatting and grouping chat messages.
 * No Firebase I/O — keeps UI components free of formatting logic.
 */

import { Message } from '@/types/chat.types';

export interface MessageGroup {
  dateLabel: string;
  messages: Message[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Format a Unix timestamp (ms) to a short human-readable time string.
 *
 * Examples:
 *   today    → "3:45 PM"
 *   this year → "Dec 12, 3:45 PM"
 *   older    → "2024/12/12 3:45 PM"
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return timeStr;

  if (isThisYear) {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr}, ${timeStr}`;
  }

  const fullDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${fullDate} ${timeStr}`;
}

/**
 * Group an ordered list of messages by calendar day.
 * Returns an array of `{ dateLabel, messages }` groups, one per day.
 *
 * Date labels:
 *   today     → "Today"
 *   yesterday → "Yesterday"
 *   other     → "Mon, Dec 12" etc.
 */
export function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  const groupMap = new Map<string, Message[]>();
  const groupOrder: string[] = [];

  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000).toDateString();

  for (const msg of messages) {
    const msgDate = new Date(msg.timestamp);
    const dateKey = msgDate.toDateString();

    if (!groupMap.has(dateKey)) {
      groupMap.set(dateKey, []);
      groupOrder.push(dateKey);
    }
    groupMap.get(dateKey)!.push(msg);
  }

  for (const dateKey of groupOrder) {
    let dateLabel: string;
    if (dateKey === today) {
      dateLabel = 'Today';
    } else if (dateKey === yesterday) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = new Date(dateKey).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }

    groups.push({ dateLabel, messages: groupMap.get(dateKey)! });
  }

  return groups;
}

/**
 * Returns `true` if a message was sent via the quick-reply mechanism.
 */
export function isQuickReply(message: Message): boolean {
  return message.type === 'quick_reply';
}
