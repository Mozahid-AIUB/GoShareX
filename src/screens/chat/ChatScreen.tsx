import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { useRideStore } from '@/store/rideStore';
import chatService, { Message } from '@/services/firebase/chatService';
import { getFare } from '@/constants/fareTable';

const QUICK_REPLIES = [
  { id: 'coming', text: '✅ আসছি' },
  { id: 'deal',   text: '✅ Deal হলো' },
  { id: 'wait',   text: '⏳ একটু অপেক্ষা করো' },
  { id: 'where',  text: '📍 কোথায় আছো?' },
  { id: 'cancel', text: '❌ Cancel' },
];

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { destination, pickupPoint } = useRideStore();

  const rider = route.params?.rider;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [dealConfirmed, setDealConfirmed] = useState(false);
  const [myDealPressed, setMyDealPressed] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fare = getFare(pickupPoint ?? 'main_gate', destination ?? 'kuril');
  const splitFare = Math.ceil(fare / 2);

  useEffect(() => {
    if (!user || !rider) return;

    const init = async () => {
      const id = await chatService.getOrCreateChat(
        user.uid, user.name ?? 'You',
        rider.userId, rider.name,
        destination ?? rider.destination,
        fare
      );
      setChatId(id);

      const unsub1 = chatService.listenToMessages(id, setMessages);
      const unsub2 = chatService.listenToChat(id, (chat) => {
        if (chat.dealConfirmed) {
          const allConfirmed = Object.values(chat.dealConfirmed).every(Boolean);
          setDealConfirmed(allConfirmed);
          if (allConfirmed) {
            navigation.navigate('RideConfirmed', { rider, chatId: id, fare, splitFare });
          }
        }
      });
      return () => { unsub1(); unsub2(); };
    };
    init();
  }, [user?.uid, rider?.userId]);

  const sendMsg = async (msgText?: string) => {
    const content = msgText ?? text.trim();
    if (!content || !chatId || !user) return;
    setText('');
    await chatService.sendMessage(chatId, user.uid, user.name ?? 'You', content);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDealConfirm = async () => {
    if (!chatId || !user) return;
    setMyDealPressed(true);
    const bothConfirmed = await chatService.confirmDeal(chatId, user.uid);
    if (bothConfirmed) {
      navigation.navigate('RideConfirmed', { rider, chatId, fare, splitFare });
    } else {
      Alert.alert('Deal Pending', `${rider.name}-এর confirmation এর জন্য অপেক্ষা করো...`);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <Avatar.Text size={28} label={item.senderName.charAt(0)} style={{ backgroundColor: '#34A853' }} labelStyle={{ color: '#fff', fontSize: 12, fontWeight: '700' }} />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      {/* Fare split box */}
      <View style={styles.fareBox}>
        <Text style={styles.fareBoxText}>🛺 {destination ?? rider?.destination}</Text>
        <Text style={styles.fareBoxFare}>৳{fare} ÷ 2 = 💰 ৳{splitFare} each</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick replies */}
      <View style={styles.quickReplies}>
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity key={qr.id} style={styles.qrBtn} onPress={() => sendMsg(qr.text)}>
            <Text style={styles.qrText}>{qr.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Divider />

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message লিখো..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={200}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => sendMsg()}>
          <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Deal confirm button */}
      {!dealConfirmed && (
        <TouchableOpacity
          style={[styles.dealBtn, myDealPressed && { backgroundColor: '#FBBC04' }]}
          onPress={handleDealConfirm}
          disabled={myDealPressed}
        >
          <Text style={styles.dealBtnText}>
            {myDealPressed ? '⏳ তোমার confirmation দেওয়া হয়েছে...' : '🤝 Deal Confirm করো'}
          </Text>
        </TouchableOpacity>
      )}

      {dealConfirmed && (
        <View style={styles.dealDone}>
          <Text style={styles.dealDoneText}>✅ Deal Confirmed! Ride শুরু হবে...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  fareBox: { backgroundColor: '#1A73E8', padding: 12, alignItems: 'center' },
  fareBoxText: { color: '#fff', fontSize: 13, opacity: 0.85 },
  fareBoxFare: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '70%', padding: 10, borderRadius: 14 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#1A73E8', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#202124' },
  quickReplies: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6, backgroundColor: '#fff' },
  qrBtn: { backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#C5D8FF' },
  qrText: { fontSize: 12, color: '#1A73E8', fontWeight: '500' },
  inputRow: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#202124', maxHeight: 80 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A73E8', alignItems: 'center', justifyContent: 'center' },
  dealBtn: { backgroundColor: '#34A853', margin: 12, padding: 16, borderRadius: 14, alignItems: 'center' },
  dealBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  dealDone: { backgroundColor: '#E8F5E9', margin: 12, padding: 14, borderRadius: 14, alignItems: 'center' },
  dealDoneText: { color: '#2E7D32', fontSize: 15, fontWeight: '700' },
});
