import React, { Component } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_DURATION = 3000;
const ANIMATION_DURATION = 320;
const HORIZONTAL_MARGIN = 16;

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  backgroundColor: string;
  icon: string;
  iconColor: string;
  textColor: string;
}

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  success: {
    backgroundColor: '#1B5E20',
    icon: 'check-circle-outline',
    iconColor: '#A5D6A7',
    textColor: '#FFFFFF',
  },
  error: {
    backgroundColor: '#B71C1C',
    icon: 'alert-circle-outline',
    iconColor: '#FFCDD2',
    textColor: '#FFFFFF',
  },
  warning: {
    backgroundColor: '#E65100',
    icon: 'alert-outline',
    iconColor: '#FFE0B2',
    textColor: '#FFFFFF',
  },
  info: {
    backgroundColor: '#0D47A1',
    icon: 'information-outline',
    iconColor: '#BBDEFB',
    textColor: '#FFFFFF',
  },
};

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

class Toast extends Component<Record<string, never>, ToastState> {
  private static instance: Toast | null = null;
  private translateY: Animated.Value;
  private opacity: Animated.Value;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      visible: false,
      message: '',
      type: 'info',
    };
    this.translateY = new Animated.Value(-120);
    this.opacity = new Animated.Value(0);
  }

  componentDidMount(): void {
    Toast.instance = this;
  }

  componentWillUnmount(): void {
    Toast.instance = null;
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  static show(options: ToastOptions): void {
    if (Toast.instance) {
      Toast.instance.showToast(options);
    }
  }

  showToast = ({ message, type = 'info', duration = TOAST_DURATION }: ToastOptions): void => {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    this.setState({ visible: true, message, type }, () => {
      Animated.parallel([
        Animated.spring(this.translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(this.opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();

      this.dismissTimer = setTimeout(() => {
        this.hideToast();
      }, duration);
    });
  };

  hideToast = (): void => {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    Animated.parallel([
      Animated.timing(this.translateY, {
        toValue: -120,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(this.opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      this.setState({ visible: false });
    });
  };

  render() {
    const { visible, message, type } = this.state;
    if (!visible) return null;

    const config = TOAST_CONFIG[type];

    return (
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: config.backgroundColor },
          {
            opacity: this.opacity,
            transform: [{ translateY: this.translateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <Icon
          name={config.icon as any}
          size={22}
          color={config.iconColor}
          style={styles.icon}
        />
        <AppText
          variant="body2"
          style={[styles.message, { color: config.textColor }]}
          numberOfLines={2}
        >
          {message}
        </AppText>
        <TouchableOpacity
          onPress={this.hideToast}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeButton}
        >
          <Icon name="close" size={18} color={config.textColor} />
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 16,
    left: HORIZONTAL_MARGIN,
    right: HORIZONTAL_MARGIN,
    maxWidth: SCREEN_WIDTH - HORIZONTAL_MARGIN * 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 2,
    flexShrink: 0,
  },
});

export default Toast;
