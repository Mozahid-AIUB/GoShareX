import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import RideConfirmedScreen from '@/screens/ride/RideConfirmedScreen';
import RideActiveScreen from '@/screens/ride/RideActiveScreen';
import RideCompleteScreen from '@/screens/ride/RideCompleteScreen';
import type { RideStackParamList } from './types';

const Stack = createStackNavigator<RideStackParamList>();

/**
 * RideStackNavigator
 * Linear flow: RideConfirmed → RideActive → RideComplete
 * All screens are gesture-disabled to prevent accidental back navigation during a ride.
 */
const RideStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="RideConfirmed" component={RideConfirmedScreen} />
      <Stack.Screen name="RideActive" component={RideActiveScreen} />
      <Stack.Screen name="RideComplete" component={RideCompleteScreen} />
    </Stack.Navigator>
  );
};

export default RideStackNavigator;
