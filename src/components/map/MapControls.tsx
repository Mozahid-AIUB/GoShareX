import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface MapControlsProps {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={onRecenter}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={22}
          color="#1A73E8"
        />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.button}
        onPress={onZoomIn}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="plus" size={22} color="#1A1A2E" />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.button}
        onPress={onZoomOut}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="minus" size={22} color="#1A1A2E" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8ECF0',
    marginHorizontal: 10,
  },
});

export default MapControls;
