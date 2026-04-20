import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import AppButton from './AppButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  iconColor?: string;
  iconSize?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
  iconColor = '#BDBDBD',
  iconSize = 72,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { width: iconSize + 32, height: iconSize + 32, borderRadius: (iconSize + 32) / 2 }]}>
        <Icon name={icon as any} size={iconSize} color={iconColor} />
      </View>

      <AppText variant="h3" bold style={styles.title}>
        {title}
      </AppText>

      {subtitle ? (
        <AppText variant="body2" style={styles.subtitle} color="#757575">
          {subtitle}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconContainer: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    color: '#424242',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  actionButton: {
    minWidth: 180,
    marginTop: 8,
  },
});

export default EmptyState;
