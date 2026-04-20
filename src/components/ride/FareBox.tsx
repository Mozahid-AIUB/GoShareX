import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface FareBoxProps {
  totalFare: number;
  pickup: string;
  destination: string;
  riders?: number;
}

const FareBox: React.FC<FareBoxProps> = ({
  totalFare,
  pickup,
  destination,
  riders = 2,
}) => {
  const splitAmount = Math.ceil(totalFare / riders);

  return (
    <View style={styles.container}>
      <View style={styles.routeRow}>
        <AppText variant="caption" style={styles.routeLabel} numberOfLines={1}>
          {pickup}
        </AppText>
        <MaterialCommunityIcons
          name="arrow-right"
          size={14}
          color="rgba(255,255,255,0.7)"
        />
        <AppText
          variant="caption"
          style={styles.routeLabel}
          numberOfLines={1}
        >
          {destination}
        </AppText>
      </View>

      <View style={styles.equationRow}>
        <AppText variant="body2" style={styles.equationText}>
          {'৳'}
          {totalFare}
        </AppText>
        <AppText variant="body2" style={styles.equationText}>
          {' '}/{' '}
        </AppText>
        <AppText variant="body2" style={styles.equationText}>
          {riders}
        </AppText>
        <AppText variant="body2" style={styles.equationText}>
          {' '}={'  '}
        </AppText>
        <AppText variant="h2" bold style={styles.splitAmount}>
          {'৳'}
          {splitAmount}
        </AppText>
      </View>

      <View style={styles.perPersonRow}>
        <MaterialCommunityIcons
          name="account-group"
          size={14}
          color="rgba(255,255,255,0.8)"
        />
        <AppText variant="caption" style={styles.perPersonText}>
          প্রতিজনের ভাগ
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A73E8',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 16,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  routeLabel: {
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 110,
    fontSize: 11,
    lineHeight: undefined,
  },
  equationRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  equationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    lineHeight: undefined,
  },
  splitAmount: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: undefined,
  },
  perPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  perPersonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: undefined,
  },
});

export default FareBox;
