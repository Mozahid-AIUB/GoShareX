import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from '@/navigation/AppNavigator';
import { theme } from '@/constants/theme';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <StatusBar style="auto" />
          <AppNavigator />
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
