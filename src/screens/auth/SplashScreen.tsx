import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '@/config/firebase.config';

const SplashScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = auth.currentUser;
      if (user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🛺</Text>
      <Text style={styles.title}>RideShare AIUB</Text>
      <Text style={styles.subtitle}>ভাড়া ভাগ করো, টাকা বাঁচাও</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});

export default SplashScreen;
