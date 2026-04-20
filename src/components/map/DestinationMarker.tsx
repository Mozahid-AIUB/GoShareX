import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from '../common/AppText';

interface DestinationMarkerProps {
  name: string;
  color?: string;
}

const DestinationMarker: React.FC<DestinationMarkerProps> = ({
  name,
  color = '#1A73E8',
}) => {
  return (
    <View style={styles.container}>
      <View style={[styles.label]}>
        <AppText variant="caption" bold style={styles.labelText} numberOfLines={1}>
          {name}
        </AppText>
      </View>
      <View style={[styles.pinBody, { backgroundColor: color }]}>
        <MaterialCommunityIcons name="map-marker" size={24} color="#FFFFFF" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    maxWidth: 120,
  },
  labelText: {
    color: '#1A1A2E',
    fontSize: 11,
    lineHeight: undefined,
  },
  pinBody: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default DestinationMarker;
