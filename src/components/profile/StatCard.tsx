import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  iconColor?: string;
  iconBg?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  iconColor = '#1A73E8',
  iconBg = '#EEF4FD',
}) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <AppText variant="h3" bold style={styles.value}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    color: '#1A1A2E',
    lineHeight: undefined,
    fontSize: 22,
  },
  label: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 11,
  },
});

export default StatCard;
