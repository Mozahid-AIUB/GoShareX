// ============================================================
// Supabase Chat Service — unified facade
//
// Firebase chatService-এর হুবহু API (একই method নাম/signature) দেয়,
// কিন্তু ভেতরে ছোট module গুলো ব্যবহার করে (ride/anonymous/realtime/
// moderation/repository)। তাই router দিয়ে সুইচ করলে screen-এর কোড
// বদলাতে হয় না।
// ============================================================
import { rideChatService } from './rideChatService';
import { anonymousChatService } from './anonymousChatService';
import { chatRealtime } from './chatRealtime';
import { chatModeration } from './chatModeration';
import { chatRepository } from './chatRepository';
import { ChatMessage, ChatRoom, MessageType } from './types';

class SupabaseChatService {
  // ---- ride chat ----
  getOrCreateChat = rideChatService.getOrCreateChat.bind(rideChatService);
  // business rule: একসময়ে একটাই active ride-deal — confirm-এর আগে চেক।
  findOtherActiveConfirmedDeal = (userId: string, exceptChatId: string) =>
    chatRepository.findOtherActiveConfirmedDeal(userId, exceptChatId);
  confirmDeal = async (chatId: string, userId: string): Promise<boolean> => {
    const chat = await chatRepository.getChat(chatId);
    const name = chat?.participantNames?.[userId] ?? 'User';
    await rideChatService.confirmDeal(chatId, userId, name);
    const updated = await chatRepository.getChat(chatId);
    const deal = updated?.dealConfirmed ?? {};
    return (updated?.participants ?? []).every((p) => deal[p]);
  };

  // ---- messaging ----
  sendMessage = (
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: MessageType = 'text',
  ) => rideChatService.sendMessage(chatId, senderId, senderName, text, type);

  // ---- realtime + receipts + typing ----
  listenToMessages = (
    chatId: string,
    cb: (m: ChatMessage[]) => void,
    onErr?: (e: Error) => void,
  ) => chatRealtime.listenToMessages(chatId, cb, onErr);
  listenToChat = (
    chatId: string,
    cb: (c: ChatRoom) => void,
    onErr?: (e: Error) => void,
  ) => chatRealtime.listenToChat(chatId, cb, onErr);
  listenToUserChats = (
    userId: string,
    cb: (c: ChatRoom[]) => void,
    onErr?: (e: Error) => void,
  ) => chatRealtime.listenToUserChats(userId, cb, onErr);
  listenToOpenGroupRooms = (
    userId: string,
    cb: (r: ChatRoom[]) => void,
    onErr?: (e: Error) => void,
  ) => chatRealtime.listenToOpenGroupRooms(userId, cb, onErr);
  markRead = (chatId: string, userId: string) => chatRealtime.markRead(chatId, userId);
  setTyping = (chatId: string, userId: string, alias: string) =>
    chatRealtime.setTyping(chatId, userId, alias);
  clearTyping = (chatId: string, userId: string) => chatRealtime.clearTyping(chatId, userId);

  // ---- moderation ----
  leaveChat = (chatId: string, userId: string) => chatModeration.leaveChat(chatId, userId);
  blockUser = (blockerId: string, blockedAlias: string, chatId: string) =>
    chatModeration.blockUser(blockerId, blockedAlias, chatId);
  getBlockedAliases = (userId: string) => chatModeration.getBlockedAliases(userId);
  deleteOwnMessage = (chatId: string, messageId: string, userId: string) =>
    chatModeration.deleteOwnMessage(chatId, messageId, userId);
  deleteChat = (chatId: string) => rideChatService.deleteChat(chatId);

  // ---- anonymous ----
  startAnonymousOneToOne = (userId: string) =>
    anonymousChatService.startAnonymousOneToOne(userId);
  startAnonymousGroup = (userId: string) =>
    anonymousChatService.startAnonymousGroup(userId);
  joinGroupById = (chatId: string, userId: string) =>
    anonymousChatService.joinGroupById(chatId, userId);
  cleanupDuplicateAnonymousRooms = (
    userId: string,
    preferredMode?: 'anonymous_1v1' | 'anonymous_group',
  ) => anonymousChatService.cleanupDuplicateAnonymousRooms(userId, preferredMode);
  cleanupUserOrphanRooms = (userId: string) =>
    anonymousChatService.cleanupUserOrphanRooms(userId);

  // ---- legacy aliases (Firebase-এ ছিল) ----
  deleteOneToOneHistory = (chatId: string) => rideChatService.deleteChat(chatId);
  deleteAnonymousRoom = (chatId: string) => rideChatService.deleteChat(chatId);
}

export default new SupabaseChatService();
