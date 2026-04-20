import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DESTINATIONS } from '@/constants/destinations';
import { PICKUP_POINTS } from '@/constants/pickupPoints';
import { getFare, getSplitFare } from '@/constants/fareTable';
import locationService from '@/services/firebase/locationService';
import { auth } from '@/config/firebase.config';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedPickup, setSelectedPickup] = useState('main_gate');
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || 'User');
    }
  };

  const requestLocationPermission = async () => {
    const granted = await locationService.requestPermissions();
    if (granted) {
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
    } else {
      Alert.alert(
        'Permission Required',
        'Location permission is required to use this app'
      );
    }
  };

  const handleDestinationSelect = (destinationId: string) => {
    setSelectedDestination(destinationId);
  };

  const handleStartSearch = () => {
    if (!selectedDestination) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    navigation.navigate('LiveMap', {
      destination: selectedDestination,
      pickup: selectedPickup,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.greeting}>হ্যালো, {userName} 👋</Text>
          <Text style={styles.location}>📍 AIUB Main Gate</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>কোথায় যাবে?</Text>
            
            <View style={styles.destinationGrid}>
              {DESTINATIONS.map((dest) => {
                const fare = getFare(selectedPickup, dest.id);
                const splitFare = getSplitFare(selectedPickup, dest.id, 2);
                const isSelected = selectedDestination === dest.id;

                return (
                  <TouchableOpacity
                    key={dest.id}
                    style={[
                      styles.destinationCard,
                      isSelected && styles.destinationCardSelected,
                    ]}
                    onPress={() => handleDestinationSelect(dest.id)}
                  >
                    <Text style={styles.destinationName}>{dest.nameBn}</Text>
                    <Text style={styles.fare}>৳{fare}</Text>
                    <Text style={styles.splitFare}>৳{splitFare} split</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleStartSearch}
          style={styles.searchButton}
          icon="magnify"
          disabled={!selectedDestination}
        >
          🔍 Rider খুঁজো
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scroll: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#1A73E8',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  destinationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  destinationCard: {
    width: '47%',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  destinationCardSelected: {
    borderColor: '#1A73E8',
    backgroundColor: '#E8F0FE',
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A73E8',
  },
  splitFare: {
    fontSize: 14,
    color: '#34A853',
  },
  searchButton: {
    margin: 16,
    paddingVertical: 8,
  },
});

export default HomeScreen;
