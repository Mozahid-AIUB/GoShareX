import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface SplitSummaryProps {
  totalFare: number;
  yourShare: number;
  partnerName: string;
  savings: number;
}

const SplitSummary: React.FC<SplitSummaryProps> = ({
  totalFare,
  yourShare,
  partnerName,
  savings,
}) => {
  const partnerFirst = partnerName.split(' ')[0];

  return (
    <View style={styles.card}>
      <AppText variant="body1" bold style={styles.title}>
        Fare Summary
      </AppText>

      <View style={styles.divider} />

      <View style={styles.row}>
        <AppText variant="body2" style={styles.rowLabel}>
          Total Fare
        </AppText>
        <AppText variant="body2" bold style={styles.rowValue}>
          {'৳'}{totalFare}
        </AppText>
      </View>

      <View style={styles.row}>
        <AppText variant="body2" style={styles.rowLabel}>
          Your Share
        </AppText>
        <AppText variant="body1" bold style={styles.yourShareValue}>
          {'৳'}{yourShare}
        </AppText>
      </View>

      <View style={styles.row}>
        <View style={styles.partnerLabel}>
          <MaterialCommunityIcons
            name="account"
            size={15}
            color="#6B7280"
          />
          <AppText variant="body2" style={styles.rowLabel}>
            {partnerFirst}-এর Share
          </AppText>
        </View>
        <AppText variant="body2" bold style={styles.rowValue}>
          {'৳'}{totalFare - yourShare}
        </AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.savingsBadge}>
        <MaterialCommunityIcons name="piggy-bank" size={18} color="#43A047" />
        <AppText variant="body2" bold style={styles.savingsText}>
          তুমি {'৳'}{savings} বাঁচিয়েছো!
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 10,
  },
  title: {
    color: '#1A1A2E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8ECF0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    color: '#6B7280',
  },
  rowValue: {
    color: '#1A1A2E',
  },
  yourShareValue: {
    color: '#1A73E8',
    fontSize: 20,
    lineHeight: undefined,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F8F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savingsText: {
    color: '#43A047',
  },
});

export default SplitSummary;
