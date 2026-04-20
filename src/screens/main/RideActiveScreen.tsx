import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '@/constants/theme';

export default function RideActiveScreen() {
  return (
    <View style={styles.container}>
      <Text variant="titleLarge">RideActiveScreen</Text>
      <Text variant="bodyMedium" style={styles.sub}>TODO: Implement this screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  sub: { color: COLORS.textSecondary, marginTop: 8 },
});
