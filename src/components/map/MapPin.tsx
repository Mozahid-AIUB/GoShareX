import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

type PinColor = 'green' | 'red' | 'gray';
type PinSize = 'small' | 'normal';

interface MapPinProps {
  color: PinColor;
  size?: PinSize;
  initials?: string;
  showIcon?: boolean;
}

const COLOR_MAP: Record<PinColor, string> = {
  green: '#43A047',
  red: '#E53935',
  gray: '#9E9E9E',
};

const BORDER_MAP: Record<PinColor, string> = {
  green: '#2E7D32',
  red: '#B71C1C',
  gray: '#616161',
};

const SIZE_MAP: Record<PinSize, number> = {
  small: 32,
  normal: 44,
};

const FONT_SIZE_MAP: Record<PinSize, number> = {
  small: 11,
  normal: 14,
};

const MapPin: React.FC<MapPinProps> = ({
  color,
  size = 'normal',
  initials,
  showIcon = false,
}) => {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const bg = COLOR_MAP[color];
  const border = BORDER_MAP[color];
  const iconSize = size === 'small' ? 16 : 22;

  const circleStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor: bg,
    borderWidth: 2.5,
    borderColor: border,
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.shadow, { borderRadius: dimension / 2 }]}>
        <View style={circleStyle}>
          {showIcon || !initials ? (
            <MaterialCommunityIcons
              name="account"
              size={iconSize}
              color="#FFFFFF"
            />
          ) : (
            <AppText
              variant="caption"
              bold
              style={{ fontSize, color: '#FFFFFF', lineHeight: undefined }}
            >
              {initials}
            </AppText>
          )}
        </View>
      </View>
      <View style={[styles.tail, { borderTopColor: bg }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default MapPin;
