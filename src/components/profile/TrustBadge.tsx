import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';
import { UserBadge } from '../../types';

interface BadgeConfig {
  icon: string;
  color: string;
  bg: string;
  label: string;
}

const BADGE_CONFIG: Record<UserBadge, BadgeConfig> = {
  'New Rider': {
    icon: 'account-circle',
    color: '#9CA3AF',
    bg: '#F5F7FA',
    label: 'New Rider',
  },
  Regular: {
    icon: 'star-circle',
    color: '#43A047',
    bg: '#F1F8F1',
    label: 'Regular',
  },
  Trusted: {
    icon: 'shield-check',
    color: '#1A73E8',
    bg: '#EEF4FD',
    label: 'Trusted',
  },
  'Elite Rider': {
    icon: 'crown',
    color: '#F9A825',
    bg: '#FFFBEA',
    label: 'Elite Rider',
  },
};

interface TrustBadgeProps {
  badge: UserBadge;
  variant?: 'compact' | 'full';
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  badge,
  variant = 'compact',
}) => {
  const config = BADGE_CONFIG[badge];

  if (variant === 'compact') {
    return (
      <View style={[styles.compact, { backgroundColor: config.bg }]}>
        <MaterialCommunityIcons
          name={config.icon}
          size={13}
          color={config.color}
        />
        <AppText
          variant="overline"
          style={[styles.compactLabel, { color: config.color }]}
        >
          {config.label}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.full, { backgroundColor: config.bg, borderColor: config.color }]}>
      <View style={[styles.fullIcon, { backgroundColor: config.color }]}>
        <MaterialCommunityIcons name={config.icon} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.fullText}>
        <AppText variant="body1" bold style={{ color: config.color }}>
          {config.label}
        </AppText>
        <AppText variant="caption" style={styles.fullSub}>
          Verified AIUB Rider
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  compactLabel: {
    fontSize: 10,
    lineHeight: undefined,
  },
  full: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  fullIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullText: {
    gap: 2,
  },
  fullSub: {
    color: '#6B7280',
  },
});

export default TrustBadge;
