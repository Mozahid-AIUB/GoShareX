import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import AppText from '../common/AppText';

interface TimerBarProps {
  totalSeconds: number;
  onExpire: () => void;
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getBarColor(remaining: number, total: number): string {
  const ratio = remaining / total;
  if (ratio > 0.5) return '#43A047';
  if (ratio > 0.25) return '#FF8F00';
  return '#E53935';
}

const TimerBar: React.FC<TimerBarProps> = ({ totalSeconds, onExpire }) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(totalSeconds);
    expiredRef.current = false;
    progressAnim.setValue(1);

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: totalSeconds * 1000,
      useNativeDriver: false,
    }).start();

    return () => clearInterval(interval);
  }, [totalSeconds]);

  const barColor = getBarColor(remaining, totalSeconds);
  const ratio = remaining / totalSeconds;
  const pct = Math.max(0, Math.min(1, ratio));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="caption" style={styles.label}>
          Time remaining
        </AppText>
        <AppText
          variant="body1"
          bold
          style={[styles.countdown, { color: barColor }]}
        >
          {formatMMSS(remaining)}
        </AppText>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#6B7280',
  },
  countdown: {
    fontSize: 18,
    lineHeight: undefined,
  },
  track: {
    height: 8,
    backgroundColor: '#E8ECF0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default TimerBar;
