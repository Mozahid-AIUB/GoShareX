import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface RatingStarsProps {
  rating: number;
  onRate?: (stars: number) => void;
  size?: number;
  interactive?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onRate,
  size = 20,
  interactive = false,
}) => {
  const [hovered, setHovered] = useState<number>(0);

  const displayRating = interactive && hovered > 0 ? hovered : rating;

  function getIconName(starIndex: number): string {
    const value = displayRating - starIndex;
    if (value >= 1) return 'star';
    if (value >= 0.5 && !interactive) return 'star-half-full';
    return 'star-outline';
  }

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }, (_, i) => {
        const starIndex = i;
        const iconName = getIconName(starIndex);
        const isFilled = iconName !== 'star-outline';

        if (interactive && onRate) {
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setHovered(0);
                onRate(i + 1);
              }}
              onPressIn={() => setHovered(i + 1)}
              onPressOut={() => setHovered(0)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={iconName as any}
                size={size}
                color={isFilled ? '#FF8F00' : '#D1D5DB'}
              />
            </TouchableOpacity>
          );
        }

        return (
          <MaterialCommunityIcons
            key={i}
            name={iconName as any}
            size={size}
            color={isFilled ? '#FF8F00' : '#D1D5DB'}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

export default RatingStars;
