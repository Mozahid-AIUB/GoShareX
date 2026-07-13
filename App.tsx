import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from '@/navigation/AppNavigator';
import { theme } from '@/constants/theme';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import OfflineBanner from '@/components/common/OfflineBanner';
import BiometricGate from '@/components/common/BiometricGate';
import { configureNotificationHandler } from '@/services/firebase/messaging';
import { setupNotificationHandlers } from '@/services/notifications/notificationHandler';
import { validateEnvironment } from '@/config/env';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { startPresenceTracking, stopPresenceTracking } from '@/services/firebase/presenceService';
import { FEATURE_FLAGS } from '@/config/featureFlags';

// Validate required env vars — throws in production if missing, logs in dev
validateEnvironment();
// Must run before the first render so foreground notifications are never dropped
configureNotificationHandler();
// Register notification received/tap listeners (toggle-gated display + routing).
// Expo Go-তে নিরীহভাবে skip হয়; dev/production build-এ কাজ করে।
setupNotificationHandlers();
// Load user's saved map style preference
void useUIStore.getState().loadMapStylePreference();
// Load privacy preferences (chat typing/read/presence toggles)
import('@/store/privacyStore').then((m) => void m.usePrivacyStore.getState().load());
// Load notification toggle preferences (Settings ride/chat alerts)
import('@/store/notificationPrefsStore').then((m) => void m.useNotificationPrefsStore.getState().load());

// Keep native splash visible until we explicitly hide it (after preload finishes).
// Catches the race where SplashScreen API is unavailable in older Expo Go.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Configure a subtle fade out animation
SplashScreen.setOptions({
  duration: 400,
  fade: true,
});

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Give the JS thread a tick to mount the navigator before hiding native
    // splash. Prevents the brief white flash between native splash and first
    // RN screen on slower devices.
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Hide the native splash as soon as the first RN frame is ready.
  // আগে শুধু onLayout-এর ভেতরে hide করা হত, কিন্তু onLayout একবারই fire হয় —
  // আর সেই মুহূর্তে `ready` তখনো false (200ms timeout বাকি)। ফলে hideAsync()
  // কখনো call হত না → Android native splash কখনো সরত না → পুরো screen
  // black/splash-এ আটকে থাকত ("Activity transferring splash screen timeout")।
  // এখন `ready` true হওয়ার সাথে সাথেই hide করি — onLayout-এর race ছাড়াই।
  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  // Track presence when logged in.
  // Supabase auth mode-এ Firebase presence skip করি — কারণ ইউজার
  // Firebase-এ login করা নেই, তাই permission_denied warning আসে।
  // presence পরে Supabase Realtime দিয়ে আনব (ধাপ ৫)।
  useEffect(() => {
    if (FEATURE_FLAGS.USE_SUPABASE_AUTH) return;
    const unsub = useAuthStore.subscribe((state) => {
      const uid = state.user?.uid;
      if (uid) startPresenceTracking(uid);
      else if (!state.isAuthenticated) {
        // best-effort cleanup; onDisconnect server-side covers crash case
        void stopPresenceTracking(state.user?.uid ?? '').catch(() => undefined);
      }
    });
    return unsub;
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <BiometricGate>
            {/* root background — আগে dark (#07090F) ছিল, কিন্তু tab
                transition-এর মাঝপথে (screen-গুলো slide/superimpose হওয়ার
                সময়) এই dark রঙ bleed করে হালকা-থিম screen (Home, Login
                ইত্যাদি) থেকে যাওয়ার সময় একটা "কালো flash layer" দেখাত।
                App-এর অধিকাংশ screen হালকা থিম, তাই root-ও হালকা রাখা হলো —
                bleed করলেও এখন সেটা লক্ষ্যণীয় flash তৈরি করে না। status
                bar/nav bar প্রতিটা screen নিজেই useSystemBars() দিয়ে control
                করে (@/hooks/useSystemBars) — এখানে সেটা নিয়ে touch করিনি। */}
            <View style={{ flex: 1, backgroundColor: '#FAF8FF' }}>
              <AppNavigator />
              <OfflineBanner />
            </View>
          </BiometricGate>
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
