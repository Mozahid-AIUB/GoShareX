import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface DealConfirmBarProps {
  myConfirmed: boolean;
  partnerConfirmed: boolean;
  onConfirm: () => void;
  partnerName: string;
}

const DealConfirmBar: React.FC<DealConfirmBarProps> = ({
  myConfirmed,
  partnerConfirmed,
  onConfirm,
  partnerName,
}) => {
  const bothConfirmed = myConfirmed && partnerConfirmed;
  const partnerFirst = partnerName.split(' ')[0];

  if (bothConfirmed) {
    return (
      <View style={styles.confirmedContainer}>
        <LinearGradient
          colors={['#43A047', '#2E7D32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.confirmedBanner}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={22}
            color="#FFFFFF"
          />
          <AppText variant="body1" bold style={styles.confirmedText}>
            Deal Confirmed! Ride শুরু হবে।
          </AppText>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <MaterialCommunityIcons
            name={myConfirmed ? 'check-circle' : 'clock-outline'}
            size={18}
            color={myConfirmed ? '#43A047' : '#9CA3AF'}
          />
          <AppText
            variant="caption"
            style={[
              styles.statusLabel,
              myConfirmed ? styles.statusConfirmed : styles.statusPending,
            ]}
          >
            তুমি {myConfirmed ? 'Confirmed' : 'Pending'}
          </AppText>
        </View>

        <View style={styles.statusDivider} />

        <View style={styles.statusItem}>
          <MaterialCommunityIcons
            name={partnerConfirmed ? 'check-circle' : 'clock-outline'}
            size={18}
            color={partnerConfirmed ? '#43A047' : '#9CA3AF'}
          />
          <AppText
            variant="caption"
            style={[
              styles.statusLabel,
              partnerConfirmed ? styles.statusConfirmed : styles.statusPending,
            ]}
          >
            {partnerFirst} {partnerConfirmed ? 'Confirmed' : 'Pending'}
          </AppText>
        </View>
      </View>

      {!myConfirmed && (
        <TouchableOpacity
          onPress={onConfirm}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#1A73E8', '#1557B0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <MaterialCommunityIcons
              name="handshake"
              size={20}
              color="#FFFFFF"
            />
            <AppText variant="button" bold style={styles.buttonText}>
              Deal Confirm করো
            </AppText>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {myConfirmed && !partnerConfirmed && (
        <View style={styles.waitingRow}>
          <MaterialCommunityIcons
            name="timer-sand"
            size={16}
            color="#FF8F00"
          />
          <AppText variant="caption" style={styles.waitingText}>
            {partnerFirst}-এর confirmation-এর জন্য অপেক্ষা করছে...
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: undefined,
  },
  statusConfirmed: {
    color: '#43A047',
  },
  statusPending: {
    color: '#9CA3AF',
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8ECF0',
    marginHorizontal: 12,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
  },
  waitingText: {
    color: '#FF8F00',
    fontSize: 12,
  },
  confirmedContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmedText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});

export default DealConfirmBar;
