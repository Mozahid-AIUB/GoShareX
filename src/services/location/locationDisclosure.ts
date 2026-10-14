import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';

// Google Play User Data policy: an in-app prominent disclosure must appear
// immediately before the OS location prompt and requires an explicit tap.
const DISCLOSURE_TITLE = 'GoShareX uses your location';
const DISCLOSURE_BODY =
  'GoShareX collects location data to show your position on the map, find nearby ' +
  'riders going to the same destination, calculate routes and fares, and share your ' +
  'live location with your matched ride partner.\n\n' +
  'Your location is shared with nearby GoShareX riders for matching and with your ' +
  'ride partner during a ride. It is collected only while the app is open and in use, ' +
  'never when the app is closed or in the background.';

function showLocationDisclosure(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      DISCLOSURE_TITLE,
      DISCLOSURE_BODY,
      [
        { text: 'No thanks', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Agree & continue', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

export async function requestForegroundLocationWithDisclosure(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;

  // react-native-web's Alert is a no-op; the browser shows its own prompt.
  if (Platform.OS !== 'web') {
    const agreed = await showLocationDisclosure();
    if (!agreed) return false;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}
