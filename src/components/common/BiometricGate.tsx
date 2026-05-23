/**
 * BiometricGate — Wraps the app and shows a biometric lock screen
 * when the app returns from background (if user has enabled it in settings).
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { biometricService } from '@/services/security/biometricService';
import { logger } from '@/utils/logger';

const LOCK_AFTER_BG_MS = 5 * 60 * 1000; // 5 minutes in background -> lock

type Props = { children: React.ReactNode };

export default function BiometricGate({ children }: Props) {
  const [locked, setLocked] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    biometricService
      .isBiometricLockEnabled()
      .then(setEnabled)
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appState.current;

      if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        backgroundedAt.current = Date.now();
      }

      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        const wasAway = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (wasAway >= LOCK_AFTER_BG_MS) {
          setLocked(true);
        }
      }

      appState.current = next;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [enabled]);

  const handleUnlock = async () => {
    const ok = await biometricService.authenticate('Unlock GoShareX').catch((err) => {
      logger.warn('BiometricGate.authenticate', err);
      return false;
    });
    if (ok) setLocked(false);
  };

  if (!locked) return <>{children}</>;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <MaterialCommunityIcons name="lock" size={80} color="#6366F1" />
        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.sub}>
          Unlock GoShareX with your fingerprint or face
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleUnlock} activeOpacity={0.85}>
          <MaterialCommunityIcons name="fingerprint" size={22} color="#FFFFFF" />
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080C14' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 18 },
  title: { fontSize: 24, fontWeight: '900', color: '#E2E8F0', marginTop: 8 },
  sub: { fontSize: 14, color: '#6E7E99', textAlign: 'center', lineHeight: 20 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
