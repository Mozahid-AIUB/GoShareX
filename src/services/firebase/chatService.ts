import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'text' | 'quick_reply' | 'location';
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  rideId?: string;
  destination: string;
  fare: number;
  lastMessage?: string;
  lastMessageTime?: number;
  dealConfirmed?: Record<string, boolean>;
}

class ChatService {
  // Create or get existing chat between 2 users
  async getOrCreateChat(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string,
    destination: string,
    fare: number,
    rideId?: string
  ): Promise<string> {
    const chatId = [user1Id, user2Id].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const existing = await getDoc(chatRef);

    if (!existing.exists()) {
      await setDoc(chatRef, {
        participants: [user1Id, user2Id],
        participantNames: { [user1Id]: user1Name, [user2Id]: user2Name },
        destination,
        fare,
        rideId: rideId ?? null,
        createdAt: serverTimestamp(),
        dealConfirmed: { [user1Id]: false, [user2Id]: false },
        lastMessage: '',
        lastMessageTime: Date.now(),
      });
    }
    return chatId;
  }

  // Send a message
  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    text: string,
    type: Message['type'] = 'text'
  ): Promise<void> {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      text,
      type,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });

    // Update last message on chat doc
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { lastMessage: text, lastMessageTime: Date.now() }, { merge: true });
  }

  // Listen to messages real-time
  listenToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));
      callback(msgs);
    });
  }

  // Confirm deal (both must press)
  async confirmDeal(chatId: string, userId: string): Promise<boolean> {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, { [`dealConfirmed.${userId}`]: true }, { merge: true });

    const updated = await getDoc(chatRef);
    const data = updated.data();
    if (!data) return false;

    const confirmed = data.dealConfirmed as Record<string, boolean>;
    return Object.values(confirmed).every(Boolean);
  }

  // Listen to chat metadata (deal status etc)
  listenToChat(chatId: string, callback: (chat: Partial<Chat>) => void): () => void {
    return onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) callback(snap.data() as Partial<Chat>);
    });
  }
}

export default new ChatService();
