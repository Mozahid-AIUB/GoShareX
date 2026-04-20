import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';

// Design system typography constants
const TYPOGRAPHY = {
  h1: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 26, lineHeight: 34, letterSpacing: -0.25 },
  h3: { fontSize: 22, lineHeight: 30, letterSpacing: 0 },
  body1: { fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  body2: { fontSize: 14, lineHeight: 22, letterSpacing: 0.25 },
  caption: { fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  overline: { fontSize: 10, lineHeight: 16, letterSpacing: 1.5 },
  button: { fontSize: 15, lineHeight: 20, letterSpacing: 0.5 },
} as const;

export type TextVariant = keyof typeof TYPOGRAPHY;

interface AppTextProps {
  variant?: TextVariant;
  color?: string;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  onPress?: () => void;
}

const AppText: React.FC<AppTextProps> = ({
  variant = 'body1',
  color,
  bold = false,
  style,
  children,
  numberOfLines,
  ellipsizeMode,
  onPress,
}) => {
  const variantStyle = TYPOGRAPHY[variant];

  const fontWeight: TextStyle['fontWeight'] = bold
    ? '700'
    : variant === 'h1' || variant === 'h2' || variant === 'h3'
    ? '700'
    : variant === 'button'
    ? '600'
    : variant === 'overline'
    ? '600'
    : '400';

  const textTransform: TextStyle['textTransform'] =
    variant === 'overline' ? 'uppercase' : 'none';

  return (
    <Text
      style={[
        styles.base,
        variantStyle,
        { fontWeight, textTransform },
        color ? { color } : undefined,
        style,
      ]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      onPress={onPress}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: '#212121',
    fontFamily: undefined, // uses system default; swap for custom font if needed
  },
});

export default AppText;
