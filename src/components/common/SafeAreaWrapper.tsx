import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle, StatusBar } from 'react-native';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  style?: ViewStyle;
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  statusBarColor?: string;
}

const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  backgroundColor = '#FFFFFF',
  style,
  statusBarStyle = 'dark-content',
  statusBarColor,
}) => {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }, style]}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor ?? backgroundColor}
        translucent={false}
      />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaWrapper;
