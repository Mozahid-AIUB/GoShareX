import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootNavProp } from '@/navigation/types';
import { DESTINATIONS } from '@/constants/destinations';
import { PICKUP_POINTS } from '@/constants/pickupPoints';
import { useAuthStore } from '@/store/authStore';
import { createPost } from '@/services/firebase/postService';

export default function CreatePostScreen() {
  const navigation = useNavigation<RootNavProp>();
  const { user } = useAuthStore();
  const [destination, setDestination] = useState('');
  const [pickupPoint, setPickupPoint] = useState('Main Gate');
  const [scheduledTime, setScheduledTime] = useState('now');
  const [maxRiders, setMaxRiders] = useState('2');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!user) return 'Please login before creating a post.';
    if (!destination) return 'Please choose a destination.';
    if (!pickupPoint) return 'Please choose a pickup point.';
    if (!maxRiders || Number.isNaN(Number(maxRiders)) || Number(maxRiders) < 2 || Number(maxRiders) > 4) {
      return 'Max riders should be between 2 and 4.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Create Post Failed', error);
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await createPost({
        authorId: user.uid,
        authorName: user.name,
        authorRating: user.rating,
        authorBadge: user.badge,
        authorPhotoURL: user.photoURL,
        destination,
        pickupPoint,
        scheduledTime,
        note: note.trim(),
        maxRiders: Number(maxRiders),
      });

      Alert.alert('Post Created', 'Your board post is now live.');
      navigation.goBack();
    } catch (submitError: any) {
      Alert.alert('Create Post Failed', submitError.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Board Post</Text>
        <Text style={styles.subtitle}>Share your route so nearby riders can join your trip.</Text>

        <Text style={styles.sectionTitle}>Destination</Text>
        <View style={styles.optionGrid}>
          {DESTINATIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionCard, destination === item.name && styles.optionCardActive]}
              onPress={() => setDestination(item.name)}
            >
              <Text style={[styles.optionTitle, destination === item.name && styles.optionTitleActive]}>
                {item.name}
              </Text>
              <Text style={[styles.optionMeta, destination === item.name && styles.optionMetaActive]}>
                Base fare BDT {item.baseFare}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Pickup Point</Text>
        <View style={styles.optionGrid}>
          {PICKUP_POINTS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.optionCard, pickupPoint === item.name && styles.optionCardActive]}
              onPress={() => setPickupPoint(item.name)}
            >
              <Text style={[styles.optionTitle, pickupPoint === item.name && styles.optionTitleActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Scheduled Time"
          mode="outlined"
          value={scheduledTime}
          onChangeText={setScheduledTime}
          style={styles.input}
        />
        <HelperText type="info">Use "now" for immediate ride posts.</HelperText>

        <TextInput
          label="Max Riders"
          mode="outlined"
          value={maxRiders}
          onChangeText={setMaxRiders}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          label="Note"
          mode="outlined"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}>
          Publish Post
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#202124' },
  subtitle: { fontSize: 14, color: '#5F6368' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#202124', marginTop: 6 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  optionCardActive: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#202124' },
  optionTitleActive: { color: '#FFFFFF' },
  optionMeta: { marginTop: 4, fontSize: 12, color: '#5F6368' },
  optionMetaActive: { color: '#DCEBFF' },
  input: { backgroundColor: '#FFFFFF' },
});
