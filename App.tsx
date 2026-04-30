import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { theme } from '@/constants/theme';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import OfflineBanner from '@/components/common/OfflineBanner';
import { configureNotificationHandler } from '@/services/firebase/messaging';
import { validateEnvironment } from '@/config/env';

// Validate required env vars — throws in production if missing, logs in dev
validateEnvironment();
// Must run before the first render so foreground notifications are never dropped
configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <View style={{ flex: 1 }}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
            <AppNavigator />
            <OfflineBanner />
          </View>
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
