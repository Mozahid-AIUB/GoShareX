import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActiveRider } from '../../types';
import Avatar from '../common/Avatar';
import AppText from '../common/AppText';

interface RiderCardProps {
  rider: ActiveRider;
  onChat: () => void;
  distance: number;
  isMatch?: boolean;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getBadgeIcon(badge: string): string {
  switch (badge) {
    case 'Elite Rider':
      return 'crown';
    case 'Trusted':
      return 'shield-check';
    case 'Regular':
      return 'star-circle';
    default:
      return 'account-circle';
  }
}

function getBadgeColor(badge: string): string {
  switch (badge) {
    case 'Elite Rider':
      return '#F9A825';
    case 'Trusted':
      return '#1A73E8';
    case 'Regular':
      return '#43A047';
    default:
      return '#9CA3AF';
  }
}

const RiderCard: React.FC<RiderCardProps> = ({
  rider,
  onChat,
  distance,
  isMatch = false,
}) => {
  const badgeIcon = getBadgeIcon(rider.badge);
  const badgeColor = getBadgeColor(rider.badge);
  const starCount = Math.round(rider.rating);

  return (
    <View
      style={[
        styles.card,
        isMatch && styles.cardMatch,
      ]}
    >
      {isMatch && (
        <View style={styles.matchBanner}>
          <MaterialCommunityIcons
            name="check-circle"
            size={13}
            color="#43A047"
          />
          <AppText variant="overline" style={styles.matchText}>
            Same Destination
          </AppText>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.avatarWrapper}>
          <Avatar
            name={rider.name}
            photoURL={rider.photoURL}
            size="medium"
          />
          <View style={[styles.distancePill]}>
            <AppText variant="overline" style={styles.distanceText}>
              {formatDistance(distance)}
            </AppText>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <AppText variant="body1" bold style={styles.name} numberOfLines={1}>
              {rider.name}
            </AppText>
            <MaterialCommunityIcons
              name={badgeIcon as any}
              size={16}
              color={badgeColor}
            />
          </View>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={13}
              color="#9CA3AF"
            />
            <AppText
              variant="caption"
              style={styles.destination}
              numberOfLines={1}
            >
              {rider.destination}
            </AppText>
          </View>

          <View style={styles.starsRow}>
            {Array.from({ length: 5 }, (_, i) => (
              <MaterialCommunityIcons
                key={i}
                name={i < starCount ? 'star' : 'star-outline'}
                size={13}
                color={i < starCount ? '#FF8F00' : '#D1D5DB'}
              />
            ))}
            <AppText variant="caption" style={styles.ratingText}>
              {rider.rating.toFixed(1)}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={onChat}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chat-outline"
            size={18}
            color="#1A73E8"
          />
          <AppText variant="caption" bold style={styles.chatLabel}>
            Chat
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1.5,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardMatch: {
    borderColor: '#43A047',
    borderWidth: 2,
  },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
    backgroundColor: '#F1F8F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  matchText: {
    color: '#43A047',
    fontSize: 10,
    lineHeight: undefined,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  distancePill: {
    backgroundColor: '#1A73E8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 12,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flex: 1,
    color: '#1A1A2E',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  destination: {
    color: '#6B7280',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: '#6B7280',
    marginLeft: 3,
    fontSize: 11,
  },
  chatButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A73E8',
    backgroundColor: '#EEF4FD',
  },
  chatLabel: {
    color: '#1A73E8',
    fontSize: 11,
    lineHeight: undefined,
  },
});

export default RiderCard;
