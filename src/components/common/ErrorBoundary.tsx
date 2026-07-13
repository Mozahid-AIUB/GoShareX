import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import { logger } from '@/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ errorInfo: info });

    logger.error('ErrorBoundary', error, { componentStack: info.componentStack });

    this.props.onError?.(error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Icon name="alert-decagram-outline" size={56} color="#E53935" />
          </View>

          <AppText variant="h3" bold style={styles.title}>
            Something went wrong
          </AppText>

          <AppText variant="body2" style={styles.subtitle} color="#757575">
            An unexpected error occurred. Please try again or contact support if
            the problem persists.
          </AppText>

          {this.state.error ? (
            <ScrollView style={styles.devContainer}>
              <AppText
                variant="caption"
                style={styles.devText}
                color="#B71C1C"
              >
                {this.state.error.toString()}
              </AppText>
              {this.state.errorInfo?.componentStack ? (
                <AppText
                  variant="caption"
                  style={styles.devText}
                  color="#616161"
                >
                  {this.state.errorInfo.componentStack}
                </AppText>
              ) : null}
            </ScrollView>
          ) : null}

          <TouchableOpacity
            onPress={this.handleReset}
            style={styles.resetButton}
            activeOpacity={0.8}
          >
            <Icon name="refresh" size={18} color="#FFFFFF" style={styles.resetIcon} />
            <AppText variant="button" style={{ color: '#FFFFFF' }}>
              Try Again
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#212121',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  devContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    maxHeight: 160,
    width: '100%',
  },
  devText: {
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A73E8',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  resetIcon: {
    marginRight: 8,
  },
});

export default ErrorBoundary;
