import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from './AppText';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 36,
  medium: 48,
  large: 64,
  xlarge: 96,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  small: 13,
  medium: 18,
  large: 24,
  xlarge: 36,
};

const INDICATOR_SIZE_MAP: Record<AvatarSize, number> = {
  small: 9,
  medium: 12,
  large: 14,
  xlarge: 18,
};

// Gradient sets for avatar fallback
const GRADIENT_SETS: Array<[string, string]> = [
  ['#1A73E8', '#0D47A1'],
  ['#43A047', '#1B5E20'],
  ['#7B1FA2', '#4A148C'],
  ['#E53935', '#B71C1C'],
  ['#FF8F00', '#E65100'],
  ['#00897B', '#004D40'],
];

function getGradientForName(name: string): [string, string] {
  if (!name) return GRADIENT_SETS[0];
  const index = name.charCodeAt(0) % GRADIENT_SETS.length;
  return GRADIENT_SETS[index];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  name?: string;
  photoURL?: string | null;
  size?: AvatarSize;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({
  name = '',
  photoURL,
  size = 'medium',
  showOnlineIndicator = false,
  isOnline = false,
  style,
}) => {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const indicatorSize = INDICATOR_SIZE_MAP[size];
  const borderRadius = dimension / 2;
  const gradientColors = getGradientForName(name);
  const initials = getInitials(name);

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius,
  };

  return (
    <View style={[styles.wrapper, style]}>
      {photoURL ? (
        <Image
          source={{ uri: photoURL }}
          style={[styles.image, containerStyle]}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, containerStyle]}
        >
          <AppText
            variant="body1"
            bold
            style={{ fontSize, color: '#FFFFFF', lineHeight: undefined }}
          >
            {initials}
          </AppText>
        </LinearGradient>
      )}

      {showOnlineIndicator && (
        <View
          style={[
            styles.indicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              backgroundColor: isOnline ? '#43A047' : '#9E9E9E',
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    backgroundColor: '#E0E0E0',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default Avatar;
