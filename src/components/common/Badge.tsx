import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

export type BadgeType = 'NEW_RIDER' | 'REGULAR' | 'TRUSTED' | 'ELITE';

interface BadgeConfig {
  label: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  NEW_RIDER: {
    label: 'New Rider',
    icon: 'account-plus-outline',
    backgroundColor: '#F5F5F5',
    textColor: '#616161',
    borderColor: '#E0E0E0',
  },
  REGULAR: {
    label: 'Regular',
    icon: 'shield-check-outline',
    backgroundColor: '#ECEFF1',
    textColor: '#546E7A',
    borderColor: '#78909C',
  },
  TRUSTED: {
    label: 'Trusted',
    icon: 'star-circle-outline',
    backgroundColor: '#FFF8E1',
    textColor: '#F57F17',
    borderColor: '#F9A825',
  },
  ELITE: {
    label: 'Elite',
    icon: 'crown-outline',
    backgroundColor: '#F3E5F5',
    textColor: '#6A1B9A',
    borderColor: '#7B1FA2',
  },
};

interface BadgeProps {
  type: BadgeType;
  compact?: boolean;
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({ type, compact = false, style }) => {
  const config = BADGE_CONFIG[type];
  const iconSize = compact ? 12 : 15;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
        compact ? styles.containerCompact : styles.containerFull,
        style,
      ]}
    >
      <Icon
        name={config.icon}
        size={iconSize}
        color={config.textColor}
        style={compact ? styles.iconCompact : styles.iconFull}
      />
      {!compact && (
        <AppText
          variant="caption"
          bold
          style={{ color: config.textColor, letterSpacing: 0.3 }}
        >
          {config.label}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  containerFull: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  containerCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  iconFull: {
    marginRight: 4,
  },
  iconCompact: {
    marginRight: 0,
  },
});

export default Badge;
