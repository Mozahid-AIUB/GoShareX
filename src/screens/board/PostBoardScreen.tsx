import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, Avatar, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, addDoc, query, orderBy, where, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { useAuthStore } from '@/store/authStore';
import { DESTINATIONS } from '@/constants/destinations';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  destination: string;
  scheduledTime: string;
  note: string;
  status: string;
  interested: string[];
  createdAt: number;
}

export default function PostBoardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selDest, setSelDest] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'posts'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
    });
    return unsub;
  }, []);

  const createPost = async () => {
    if (!selDest || !user) return;
    await addDoc(collection(db, 'posts'), {
      authorId: user.uid,
      authorName: user.name ?? 'Student',
      destination: selDest,
      scheduledTime: 'এখনই',
      note: note || 'এখনই যাবো',
      status: 'open',
      interested: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + 1800000,
      createdAtServer: serverTimestamp(),
    });
    setShowCreate(false);
    setSelDest('');
    setNote('');
  };

  const joinPost = async (post: Post) => {
    if (!user || post.authorId === user.uid) return;
    await updateDoc(doc(db, 'posts', post.id), { interested: arrayUnion(user.uid) });
    Alert.alert('✅ Joined!', `${post.authorName}-এর সাথে ${post.destination} যাওয়ার request পাঠানো হয়েছে।`);
  };

  const filtered = filter ? posts.filter((p) => p.destination === filter) : posts;

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar.Text size={40} label={item.authorName.charAt(0)} style={{ backgroundColor: '#1A73E8' }} labelStyle={{ color: '#fff', fontWeight: '700' }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.postName}>{item.authorName}</Text>
          <Text style={styles.postTime}>{item.scheduledTime}</Text>
        </View>
        <View style={styles.destBadge}>
          <Text style={styles.destBadgeText}>{item.destination}</Text>
        </View>
      </View>
      {item.note ? <Text style={styles.postNote}>{item.note}</Text> : null}
      <View style={styles.postFooter}>
        <Text style={styles.interestedText}>👋 {item.interested.length} interested</Text>
        {item.authorId !== user?.uid && (
          <TouchableOpacity
            style={[styles.joinBtn, item.interested.includes(user?.uid ?? '') && styles.joinBtnDone]}
            onPress={() => joinPost(item)}
            disabled={item.interested.includes(user?.uid ?? '')}
          >
            <Text style={styles.joinBtnText}>
              {item.interested.includes(user?.uid ?? '') ? '✅ Joined' : '+ Join'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, !filter && styles.filterChipActive]} onPress={() => setFilter('')}>
          <Text style={[styles.filterChipText, !filter && { color: '#fff' }]}>সব</Text>
        </TouchableOpacity>
        {DESTINATIONS.map((d) => (
          <TouchableOpacity key={d.id} style={[styles.filterChip, filter === d.name && styles.filterChipActive]} onPress={() => setFilter(filter === d.name ? '' : d.name)}>
            <Text style={[styles.filterChipText, filter === d.name && { color: '#fff' }]}>{d.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 40 }}>📋</Text><Text style={styles.emptyText}>কোনো post নেই</Text></View>}
      />

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabText}>+ Post</Text>
      </TouchableOpacity>

      {/* Create Post Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.overlay} onPress={() => setShowCreate(false)} />
        <View style={[styles.modal, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>নতুন Post করো</Text>
          <Divider style={{ marginBottom: 16 }} />
          <Text style={styles.modalLabel}>Destination বেছে নাও:</Text>
          <View style={styles.destGrid}>
            {DESTINATIONS.map((d) => (
              <TouchableOpacity key={d.id} style={[styles.destOption, selDest === d.name && styles.destOptionActive]} onPress={() => setSelDest(d.name)}>
                <Text style={[styles.destOptionText, selDest === d.name && { color: '#fff' }]}>{d.name}</Text>
                <Text style={[styles.destFare, selDest === d.name && { color: '#cff' }]}>৳{d.baseFare}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.createBtn, !selDest && { backgroundColor: '#DADCE0' }]} onPress={createPost} disabled={!selDest}>
            <Text style={styles.createBtnText}>Post করো 🚀</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  filterRow: { flexDirection: 'row', padding: 10, gap: 6, flexWrap: 'wrap', backgroundColor: '#fff', elevation: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#F0F0F0' },
  filterChipActive: { backgroundColor: '#1A73E8' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  postCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  postName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  postTime: { fontSize: 12, color: '#9E9E9E' },
  destBadge: { backgroundColor: '#E8F0FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  destBadgeText: { fontSize: 12, color: '#1A73E8', fontWeight: '700' },
  postNote: { fontSize: 13, color: '#555', marginBottom: 10 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interestedText: { fontSize: 12, color: '#9E9E9E' },
  joinBtn: { backgroundColor: '#1A73E8', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  joinBtnDone: { backgroundColor: '#34A853' },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9E9E9E' },
  fab: { position: 'absolute', right: 20, backgroundColor: '#1A73E8', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28, elevation: 6 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#202124', marginBottom: 4 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 12 },
  destGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  destOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center' },
  destOptionActive: { backgroundColor: '#1A73E8' },
  destOptionText: { fontSize: 13, fontWeight: '600', color: '#202124' },
  destFare: { fontSize: 10, color: '#9E9E9E', marginTop: 2 },
  createBtn: { backgroundColor: '#34A853', padding: 16, borderRadius: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
