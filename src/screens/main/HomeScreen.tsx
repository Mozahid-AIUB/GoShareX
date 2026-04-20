import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore, useRideStore } from '@/store';
import DestinationGrid from '@/components/ride/DestinationGrid';
import { COLORS } from '@/constants/theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { selectedDestination, selectedPickup, setDestination } = useRideStore();

  const handleFindRider = () => {
    if (!selectedDestination) return;
    navigation.navigate('LiveMap', {
      destination: selectedDestination,
      pickupPoint: selectedPickup ?? 'Main Gate',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.greeting}>
        হ্যালো, {user?.name ?? 'বন্ধু'} 👋
      </Text>
      <Text variant="bodyMedium" style={styles.pickup}>📍 {selectedPickup ?? 'Main Gate'}</Text>

      <Text variant="titleMedium" style={styles.sectionTitle}>কোথায় যাবে?</Text>
      <DestinationGrid onSelect={setDestination} selected={selectedDestination} />

      <Button
        mode="contained"
        onPress={handleFindRider}
        disabled={!selectedDestination}
        style={styles.findButton}
        icon="magnify"
      >
        Rider খুঁজো 🔍
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  greeting: { color: COLORS.text, fontWeight: 'bold', marginBottom: 4 },
  pickup: { color: COLORS.textSecondary, marginBottom: 24 },
  sectionTitle: { marginBottom: 12, color: COLORS.text },
  findButton: { marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 12 },
});
