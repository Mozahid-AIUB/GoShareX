import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import AppText from './AppText';

interface DividerProps {
  label?: string;
  color?: string;
  thickness?: number;
  style?: ViewStyle;
  labelColor?: string;
}

const Divider: React.FC<DividerProps> = ({
  label,
  color = '#E0E0E0',
  thickness = StyleSheet.hairlineWidth,
  style,
  labelColor = '#9E9E9E',
}) => {
  if (label) {
    return (
      <View style={[styles.rowContainer, style]}>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
        <AppText
          variant="caption"
          style={[styles.labelText, { color: labelColor }]}
        >
          {label}
        </AppText>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.simpleLine,
        { backgroundColor: color, height: thickness },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  simpleLine: {
    width: '100%',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
  },
  labelText: {
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
});

export default Divider;
