import { create } from 'zustand';
import type { Chat, Message } from '@/types';

interface ChatState {
  chats: Chat[];
  activeMessages: Message[];
  setChats: (chats: Chat[]) => void;
  setActiveMessages: (msgs: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeMessages: [],
  setChats: (chats) => set({ chats }),
  setActiveMessages: (activeMessages) => set({ activeMessages }),
}));
