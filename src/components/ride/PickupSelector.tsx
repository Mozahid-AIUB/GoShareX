import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PICKUP_POINTS } from '../../constants/pickupPoints';
import AppText from '../common/AppText';

interface PickupSelectorProps {
  selected: string;
  onSelect: (pickupId: string) => void;
}

const PickupSelector: React.FC<PickupSelectorProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" style={styles.sectionLabel}>
        Pickup Point
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {PICKUP_POINTS.map((point) => {
          const isSelected = selected === point.id;
          return (
            <TouchableOpacity
              key={point.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(point.id)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color={isSelected ? '#FFFFFF' : '#6B7280'}
              />
              <AppText
                variant="caption"
                bold={isSelected}
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {point.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  sectionLabel: {
    color: '#6B7280',
    paddingHorizontal: 16,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5,
    borderColor: '#E8ECF0',
  },
  chipSelected: {
    backgroundColor: '#1A73E8',
    borderColor: '#1557B0',
  },
  chipLabel: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: undefined,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
});

export default PickupSelector;
