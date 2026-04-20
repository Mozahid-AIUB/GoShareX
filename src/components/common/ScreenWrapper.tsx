import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  StatusBar,
  RefreshControl,
} from 'react-native';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  statusBarColor?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardAvoiding?: boolean;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = false,
  backgroundColor = '#F5F7FA',
  style,
  contentContainerStyle,
  statusBarStyle = 'dark-content',
  statusBarColor,
  refreshing = false,
  onRefresh,
  keyboardAvoiding = true,
}) => {
  const inner = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1A73E8']}
            tintColor="#1A73E8"
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <>{children}</>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor }, style]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor ?? backgroundColor}
        translucent={false}
      />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default ScreenWrapper;
