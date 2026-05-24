import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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
import { validateEnvironment } from '@/config/env';
import { useUIStore } from '@/store/uiStore';

// Validate required env vars — throws in production if missing, logs in dev
validateEnvironment();
// Must run before the first render so foreground notifications are never dropped
configureNotificationHandler();
// Load user's saved map style preference
void useUIStore.getState().loadMapStylePreference();

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

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <BiometricGate>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
              <AppNavigator />
              <OfflineBanner />
            </View>
          </BiometricGate>
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
