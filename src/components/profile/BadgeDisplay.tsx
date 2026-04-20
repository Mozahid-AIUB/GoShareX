import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';
import { UserBadge } from '../../types';

interface BadgeTier {
  badge: UserBadge;
  minRides: number;
  icon: string;
  color: string;
}

const TIERS: BadgeTier[] = [
  { badge: 'New Rider', minRides: 0, icon: 'account-circle', color: '#9CA3AF' },
  { badge: 'Regular', minRides: 5, icon: 'star-circle', color: '#43A047' },
  { badge: 'Trusted', minRides: 20, icon: 'shield-check', color: '#1A73E8' },
  { badge: 'Elite Rider', minRides: 50, icon: 'crown', color: '#F9A825' },
];

interface BadgeDisplayProps {
  currentBadge: UserBadge;
  totalRides: number;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  currentBadge,
  totalRides,
}) => {
  const currentTierIndex = TIERS.findIndex((t) => t.badge === currentBadge);
  const currentTier = TIERS[currentTierIndex];
  const nextTier = TIERS[currentTierIndex + 1] ?? null;

  let progressRatio = 1;
  let progressLabel = 'Max level reached!';

  if (nextTier) {
    const ridesInCurrentTier = totalRides - currentTier.minRides;
    const ridesNeeded = nextTier.minRides - currentTier.minRides;
    progressRatio = Math.min(ridesInCurrentTier / ridesNeeded, 1);
    progressLabel = `${totalRides}/${nextTier.minRides} rides to ${nextTier.badge}`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: currentTier.color }]}>
          <MaterialCommunityIcons
            name={currentTier.icon as any}
            size={26}
            color="#FFFFFF"
          />
        </View>
        <View style={styles.headerText}>
          <AppText variant="body1" bold style={{ color: currentTier.color }}>
            {currentTier.badge}
          </AppText>
          <AppText variant="caption" style={styles.ridesLabel}>
            {totalRides} rides completed
          </AppText>
        </View>
        {nextTier && (
          <View style={styles.nextBadge}>
            <AppText variant="overline" style={styles.nextLabel}>
              Next
            </AppText>
            <MaterialCommunityIcons
              name={nextTier.icon as any}
              size={18}
              color={nextTier.color}
            />
          </View>
        )}
      </View>

      {nextTier && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progressRatio * 100)}%`,
                  backgroundColor: currentTier.color,
                },
              ]}
            />
          </View>
          <AppText variant="caption" style={styles.progressLabel}>
            {progressLabel}
          </AppText>
        </View>
      )}

      {!nextTier && (
        <View style={styles.maxRow}>
          <MaterialCommunityIcons name="trophy" size={16} color="#F9A825" />
          <AppText variant="caption" bold style={styles.maxText}>
            Highest Badge Achieved!
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  ridesLabel: {
    color: '#6B7280',
  },
  nextBadge: {
    alignItems: 'center',
    gap: 2,
  },
  nextLabel: {
    color: '#9CA3AF',
    fontSize: 9,
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E8ECF0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    color: '#6B7280',
    textAlign: 'right',
  },
  maxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFBEA',
    borderRadius: 10,
    paddingVertical: 8,
  },
  maxText: {
    color: '#F9A825',
  },
});

export default BadgeDisplay;
