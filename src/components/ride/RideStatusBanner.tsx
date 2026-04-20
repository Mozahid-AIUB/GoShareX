import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';
import { RideStatus } from '../../types';

interface BannerConfig {
  icon: string;
  color: string;
  bg: string;
  message: string;
}

const STATUS_CONFIG: Record<RideStatus, BannerConfig> = {
  pending: {
    icon: 'magnify',
    color: '#1A73E8',
    bg: '#EEF4FD',
    message: 'Rider খুঁজছে...',
  },
  confirmed: {
    icon: 'handshake',
    color: '#43A047',
    bg: '#F1F8F1',
    message: 'Ride Confirmed! যাচ্ছো।',
  },
  started: {
    icon: 'rickshaw',
    color: '#FF8F00',
    bg: '#FFF8E1',
    message: 'Ride চলছে...',
  },
  completed: {
    icon: 'flag-checkered',
    color: '#43A047',
    bg: '#F1F8F1',
    message: 'Ride Complete! ধন্যবাদ।',
  },
  cancelled: {
    icon: 'close-circle',
    color: '#E53935',
    bg: '#FFF0F0',
    message: 'Ride Cancel হয়েছে।',
  },
};

interface RideStatusBannerProps {
  status: RideStatus;
  customMessage?: string;
}

const RideStatusBanner: React.FC<RideStatusBannerProps> = ({
  status,
  customMessage,
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.banner, { backgroundColor: config.bg }]}>
      <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={16}
          color="#FFFFFF"
        />
      </View>
      <AppText
        variant="body2"
        bold
        style={[styles.message, { color: config.color }]}
      >
        {customMessage ?? config.message}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
  },
});

export default RideStatusBanner;
