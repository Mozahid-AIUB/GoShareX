import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';

interface ChatItem {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  destination: string;
  fare: number;
  lastMessage: string;
  lastMessageTime: number;
  dealConfirmed: Record<string, boolean>;
}

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('lastMessageTime', 'desc'));
    return onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatItem)));
    });
  }, [user?.uid]);

  const renderChat = ({ item }: { item: ChatItem }) => {
    const otherUid = item.participants.find((p) => p !== user?.uid) ?? '';
    const otherName = item.participantNames[otherUid] ?? 'Rider';
    const bothConfirmed = Object.values(item.dealConfirmed ?? {}).every(Boolean);
    const timeStr = item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => navigation.navigate('Chat', { rider: { userId: otherUid, name: otherName, destination: item.destination, rating: 5, distance: 0, badge: 'Rider', lat: 0, lng: 0, isMatch: true }, chatId: item.id })}>
        <Avatar.Text size={48} label={otherName.charAt(0)} style={{ backgroundColor: bothConfirmed ? '#34A853' : '#1A73E8' }} labelStyle={{ color: '#fff', fontWeight: '700' }} />
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName}>{otherName}</Text>
            <Text style={styles.chatTime}>{timeStr}</Text>
          </View>
          <Text style={styles.chatDest}>📍 {item.destination} · ৳{Math.ceil(item.fare / 2)} split</Text>
          <Text style={styles.chatLastMsg} numberOfLines={1}>{item.lastMessage || 'Chat শুরু হয়েছে'}</Text>
        </View>
        {bothConfirmed && <View style={styles.dealBadge}><Text style={styles.dealBadgeText}>Deal ✅</Text></View>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        renderItem={renderChat}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={styles.emptyTitle}>কোনো chat নেই</Text>
            <Text style={styles.emptySub}>Map থেকে rider খুঁজে chat শুরু করো</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { fontSize: 22, fontWeight: '800', color: '#202124', padding: 16, paddingBottom: 8, backgroundColor: '#fff' },
  chatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  chatName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  chatTime: { fontSize: 11, color: '#9E9E9E' },
  chatDest: { fontSize: 12, color: '#1A73E8', marginBottom: 3 },
  chatLastMsg: { fontSize: 12, color: '#9E9E9E' },
  dealBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dealBadgeText: { fontSize: 11, color: '#2E7D32', fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
  emptySub: { fontSize: 13, color: '#9E9E9E', textAlign: 'center' },
});
