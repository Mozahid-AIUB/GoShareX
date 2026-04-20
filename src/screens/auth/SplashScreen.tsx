import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase.config';
import { useAuthStore } from '@/store';

const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useAuthStore();
  const resolved = useRef(false);

  useEffect(() => {
    // onAuthStateChanged fires once Firebase has restored the persisted session.
    // auth.currentUser is null until this callback fires — don't use it directly.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (resolved.current) return;
      resolved.current = true;

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const userData = snap.data() as any;

            // Suspension check
            if (userData.isSuspended) {
              const expiresAt: number = userData.suspensionExpiresAt ?? 0;
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
            navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
            return;
          }
        } catch (e) {
          console.warn('[Splash] Firestore read failed:', e);
        }
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