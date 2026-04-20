import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActiveRider } from '../../types';
import AppText from '../common/AppText';

interface RiderMarkerProps {
  rider: ActiveRider;
  onPress: () => void;
  isMatch: boolean;
  distance: number;
}

const MATCH_COLOR = '#43A047';
const NO_MATCH_COLOR = '#E53935';
const IN_RIDE_COLOR = '#9E9E9E';

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getPinColor(rider: ActiveRider, isMatch: boolean): string {
  if (rider.status === 'riding') return IN_RIDE_COLOR;
  return isMatch ? MATCH_COLOR : NO_MATCH_COLOR;
}

const RiderMarker: React.FC<RiderMarkerProps> = ({
  rider,
  onPress,
  isMatch,
  distance,
}) => {
  const pinColor = getPinColor(rider, isMatch);
  const initials = getInitials(rider.name);
  const distanceLabel =
    distance < 1000
      ? `${Math.round(distance)}m`
      : `${(distance / 1000).toFixed(1)}km`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <View style={[styles.distanceBadge, { backgroundColor: pinColor }]}>
        <AppText variant="overline" style={styles.distanceText}>
          {distanceLabel}
        </AppText>
      </View>

      <View style={[styles.avatarRing, { borderColor: pinColor }]}>
        {rider.photoURL ? (
          <Image
            source={{ uri: rider.photoURL }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: pinColor }]}>
            <AppText variant="body2" bold style={styles.initialsText}>
              {initials}
            </AppText>
          </View>
        )}
        {rider.status === 'riding' && (
          <View style={styles.ridingBadge}>
            <MaterialCommunityIcons name="rickshaw" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={[styles.nameTag, { borderColor: pinColor }]}>
        <AppText
          variant="caption"
          bold
          style={styles.nameText}
          numberOfLines={1}
        >
          {rider.name.split(' ')[0]}
        </AppText>
      </View>

      <View style={[styles.tail, { borderTopColor: pinColor }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  distanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 3,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 12,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: undefined,
  },
  ridingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF8F00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameTag: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
    maxWidth: 80,
  },
  nameText: {
    color: '#212121',
    fontSize: 11,
    lineHeight: undefined,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default RiderMarker;
