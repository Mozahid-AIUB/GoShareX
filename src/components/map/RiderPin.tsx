import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type RiderStatus = 'waiting' | 'matched' | 'riding';

interface RiderPinProps {
  riderStatus: RiderStatus;
  size?: number;
}

const STATUS_COLOR: Record<RiderStatus, string> = {
  waiting: '#43A047',
  matched: '#1A73E8',
  riding: '#9E9E9E',
};

const STATUS_BORDER: Record<RiderStatus, string> = {
  waiting: '#2E7D32',
  matched: '#1557B0',
  riding: '#616161',
};

const RiderPin: React.FC<RiderPinProps> = ({ riderStatus, size = 40 }) => {
  const bg = STATUS_COLOR[riderStatus];
  const border = STATUS_BORDER[riderStatus];
  const iconSize = Math.round(size * 0.55);
  const borderRadius = size / 2;
  const tailBorderTopWidth = Math.round(size * 0.22);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: bg,
            borderColor: border,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="account"
          size={iconSize}
          color="#FFFFFF"
        />
      </View>
      <View
        style={[
          styles.tail,
          {
            borderTopColor: bg,
            borderTopWidth: tailBorderTopWidth,
            borderLeftWidth: size * 0.15,
            borderRightWidth: size * 0.15,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  circle: {
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default RiderPin;
