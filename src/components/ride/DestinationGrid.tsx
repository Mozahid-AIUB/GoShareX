import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { DESTINATIONS } from '@/constants/locations';
import { COLORS } from '@/constants/theme';

interface Props {
  onSelect: (dest: string) => void;
  selected: string | null;
}

export default function DestinationGrid({ onSelect, selected }: Props) {
  return (
    <View style={styles.grid}>
      {DESTINATIONS.map((dest) => {
        const isSelected = selected === dest.label;
        return (
          <TouchableOpacity
            key={dest.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(dest.label)}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {dest.label}
            </Text>
            <Text style={[styles.fare, isSelected && styles.fareSelected]}>
              {dest.baseFareFromMainGate}৳ → {Math.ceil(dest.baseFareFromMainGate / 2)}৳
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%', padding: 12, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  cardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  label: { fontWeight: '600', color: COLORS.text, fontSize: 14 },
  labelSelected: { color: '#fff' },
  fare: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  fareSelected: { color: 'rgba(255,255,255,0.85)' },
});
