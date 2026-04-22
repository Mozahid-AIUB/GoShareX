import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESTINATIONS } from '@/constants/destinations';
import { useAuthStore } from '@/store/authStore';
import type { RootNavProp } from '@/navigation/types';
import type { Post } from '@/types/post.types';
import {
  cancelPost,
  joinPost,
  subscribeToOpenPosts,
} from '@/services/firebase/postService';

export default function PostBoardScreen() {
  const navigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState('');
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOpenPosts(setPosts);
    return unsubscribe;
  }, []);

  const filteredPosts = useMemo(() => {
    if (!filter) return posts;
    return posts.filter((post) => post.destination === filter);
  }, [filter, posts]);

  const handleJoin = async (post: Post) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to join a board post.');
      return;
    }

    if (post.authorId === user.uid) {
      Alert.alert('Own Post', 'You cannot join your own board post.');
      return;
    }

    setBusyPostId(post.postId);
    try {
      await joinPost(post.postId, user.uid);
      Alert.alert('Joined', `Your request for ${post.destination} has been sent.`);
    } catch (error: any) {
      Alert.alert('Join Failed', error.message ?? 'Please try again.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleCancel = async (post: Post) => {
    if (!user) return;

    setBusyPostId(post.postId);
    try {
      await cancelPost(post.postId, user.uid);
      Alert.alert('Post Cancelled', 'Your board post has been cancelled.');
    } catch (error: any) {
      Alert.alert('Cancel Failed', error.message ?? 'Please try again.');
    } finally {
      setBusyPostId(null);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const joined = item.interested.includes(user?.uid ?? '');
    const isOwner = item.authorId === user?.uid;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Avatar.Text
            size={42}
            label={(item.authorName || 'U').charAt(0).toUpperCase()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={styles.postMeta}>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <Text style={styles.metaText}>{item.pickupPoint} to {item.destination}</Text>
            <Text style={styles.metaText}>{item.scheduledTime}</Text>
          </View>
          <View style={styles.destinationBadge}>
            <Text style={styles.destinationBadgeText}>{item.destination}</Text>
          </View>
        </View>

        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.interestedText}>{item.interested.length} interested</Text>
          {isOwner ? (
            <Button
              mode="contained-tonal"
              onPress={() => handleCancel(item)}
              loading={busyPostId === item.postId}
              disabled={busyPostId === item.postId}
            >
              Cancel
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => handleJoin(item)}
              loading={busyPostId === item.postId}
              disabled={joined || busyPostId === item.postId}
            >
              {joined ? 'Joined' : 'Join'}
            </Button>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !filter && styles.filterChipActive]}
          onPress={() => setFilter('')}
        >
          <Text style={[styles.filterChipText, !filter && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {DESTINATIONS.map((destination) => (
          <TouchableOpacity
            key={destination.id}
            style={[styles.filterChip, filter === destination.name && styles.filterChipActive]}
            onPress={() => setFilter(filter === destination.name ? '' : destination.name)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === destination.name && styles.filterChipTextActive,
              ]}
            >
              {destination.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.postId}
        renderItem={renderPost}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 32 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No board posts yet</Text>
            <Text style={styles.emptySubtitle}>Create the first ride-share post for your destination.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Text style={styles.fabText}>+ Post</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#FFFFFF' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ECEFF1' },
  filterChipActive: { backgroundColor: '#1A73E8' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#455A64' },
  filterChipTextActive: { color: '#FFFFFF' },
  listContent: { padding: 14, gap: 12, paddingBottom: 100 },
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { backgroundColor: '#1A73E8' },
  avatarLabel: { color: '#FFFFFF', fontWeight: '700' },
  postMeta: { flex: 1, gap: 2 },
  authorName: { fontSize: 15, fontWeight: '700', color: '#202124' },
  metaText: { fontSize: 12, color: '#5F6368' },
  destinationBadge: { backgroundColor: '#E8F0FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  destinationBadgeText: { color: '#1A73E8', fontSize: 12, fontWeight: '700' },
  note: { fontSize: 13, color: '#444', lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interestedText: { fontSize: 12, color: '#5F6368' },
  emptyState: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
  emptySubtitle: { fontSize: 14, color: '#5F6368', textAlign: 'center' },
  fab: { position: 'absolute', right: 20, backgroundColor: '#1A73E8', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, elevation: 6 },
  fabText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
