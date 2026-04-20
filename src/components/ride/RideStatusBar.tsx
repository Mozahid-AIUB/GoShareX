import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

type RideStep = 'searching' | 'matched' | 'confirmed' | 'active' | 'complete';

interface Step {
  id: RideStep;
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { id: 'searching', label: 'Searching', icon: 'magnify' },
  { id: 'matched', label: 'Matched', icon: 'account-check' },
  { id: 'confirmed', label: 'Confirmed', icon: 'handshake' },
  { id: 'active', label: 'Active', icon: 'rickshaw' },
  { id: 'complete', label: 'Complete', icon: 'flag-checkered' },
];

const STEP_ORDER = STEPS.map((s) => s.id);

interface RideStatusBarProps {
  currentStep: RideStep;
}

const RideStatusBar: React.FC<RideStatusBarProps> = ({ currentStep }) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        const isUpcoming = index > currentIndex;

        const circleColor = isDone
          ? '#43A047'
          : isActive
          ? '#1A73E8'
          : '#E8ECF0';

        const iconColor = isDone || isActive ? '#FFFFFF' : '#9CA3AF';
        const labelColor = isActive
          ? '#1A73E8'
          : isDone
          ? '#43A047'
          : '#9CA3AF';

        return (
          <React.Fragment key={step.id}>
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: circleColor },
                  isActive && styles.circleActive,
                ]}
              >
                {isDone ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color="#FFFFFF"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={step.icon}
                    size={14}
                    color={iconColor}
                  />
                )}
              </View>
              <AppText
                variant="overline"
                style={[styles.label, { color: labelColor }]}
              >
                {step.label}
              </AppText>
            </View>

            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: index < currentIndex ? '#43A047' : '#E8ECF0' },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  stepWrapper: {
    alignItems: 'center',
    gap: 5,
    minWidth: 52,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  label: {
    fontSize: 8,
    textAlign: 'center',
    lineHeight: undefined,
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 14,
    borderRadius: 1,
  },
});

export default RideStatusBar;
