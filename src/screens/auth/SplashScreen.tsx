import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/config/firebase.config';
import { useAuthStore } from '@/store';
import authService from '@/services/firebase/authService';

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useAuthStore();
  const resolved = useRef(false);

  const buildFallbackUser = (firebaseUser: FirebaseUser) => {
    const email = (firebaseUser.email ?? '').trim().toLowerCase();
    const name = email.split('@')[0] || firebaseUser.displayName || 'AIUB Student';

    return {
      uid: firebaseUser.uid,
      email,
      name,
      studentId: '',
      department: '',
      phoneNumber: '',
      rating: 5,
      totalRides: 0,
      totalSaved: 0,
      completionRate: 100,
      badge: 'New Rider' as const,
      strikes: 0,
      isSuspended: false,
      createdAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    // onAuthStateChanged fires once Firebase has restored the persisted session.
    // auth.currentUser is null until this callback fires — don't use it directly.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (resolved.current) return;
      resolved.current = true;

      if (firebaseUser) {
        const fallbackUser = buildFallbackUser(firebaseUser);
        setUser(fallbackUser);
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });

        try {
          const userData = await authService.getCurrentUser();
          if (userData) {
            if (userData.isSuspended) {
              const expiresAt: number = (userData as any).suspensionExpiresAt ?? userData.suspendedUntil ?? 0;
              if (Date.now() < expiresAt) {
                const remainingHours = Math.ceil((expiresAt - Date.now()) / 3_600_000);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Suspension', params: { remainingHours, reason: userData.suspensionReason } }],
                });
                return;
              }
            }

            setUser(userData);
          }
        } catch (e) {
          console.warn('[Splash] Firestore read failed:', e);
        }

        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🛺</Text>
      <Text style={styles.title}>RideShare AIUB</Text>
      <Text style={styles.subtitle}>ভাড়া ভাগ করো, টাকা বাঁচাও</Text>
      <ActivityIndicator color="#fff" style={styles.spinner} size="small" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  spinner: { marginTop: 40 },
});

export default SplashScreen;
