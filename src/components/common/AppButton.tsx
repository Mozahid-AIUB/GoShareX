import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

const COLORS = {
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  disabled: '#BDBDBD',
  disabledBg: '#EEEEEE',
  secondaryBg: '#E8F0FE',
};

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
  textStyle?: StyleProp<TextStyle>;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const getTextColor = (): string => {
    if (isDisabled) {
      return variant === 'primary' ? 'rgba(255,255,255,0.6)' : COLORS.disabled;
    }
    switch (variant) {
      case 'primary':
        return COLORS.surface;
      case 'secondary':
      case 'outlined':
      case 'ghost':
        return COLORS.primary;
      default:
        return COLORS.surface;
    }
  };

  const textColor = getTextColor();

  const renderInner = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLORS.surface : COLORS.primary}
          style={styles.spinner}
        />
      ) : icon ? (
        <Icon name={icon} size={18} color={textColor} style={styles.icon} />
      ) : null}
      <AppText variant="button" style={[{ color: textColor }, textStyle]}>
        {title}
      </AppText>
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.touchBase, style]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? [COLORS.disabledBg, COLORS.disabledBg]
              : ['#1A73E8', '#1557B0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {renderInner()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: isDisabled ? COLORS.disabledBg : COLORS.secondaryBg }
      : variant === 'outlined'
      ? {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: isDisabled ? COLORS.disabled : COLORS.primary,
        }
      : { backgroundColor: 'transparent' };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.72}
      style={[
        styles.touchBase,
        styles.nonGradientInner,
        variantStyles,
        isDisabled && styles.disabledOpacity,
        style,
      ]}
    >
      {renderInner()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchBase: {
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 48,
  },
  gradient: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  nonGradientInner: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    minHeight: 48,
  },
  disabledOpacity: {
    opacity: 0.55,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
  },
});

export default AppButton;
