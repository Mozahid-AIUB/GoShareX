# ─── New dependencies for Session 4 ─────────────────────────────────────────
# Run these commands after extracting Session 4 files:

npm install react-native-linear-gradient
npm install react-native-vector-icons
npm install @types/react-native-vector-icons

npx expo install expo-device

# For react-native-linear-gradient (bare workflow):
# npx react-native link react-native-linear-gradient

# For react-native-vector-icons on Android, add to android/app/build.gradle:
# apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"

# ─── .env additions ──────────────────────────────────────────────────────────
# Add to your .env file:

EXPO_PROJECT_ID=your_expo_project_id_here

# Get this from: https://expo.dev → your project → Project ID
# Required for push notification tokens

# ─── OPTIONAL: If using Expo managed workflow instead of bare ─────────────────
# Replace react-native-linear-gradient with expo-linear-gradient:
#   npx expo install expo-linear-gradient
#
# Replace react-native-vector-icons with @expo/vector-icons:
#   (already bundled with Expo, no install needed)
#   import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
#
# All Session 4 files use MaterialCommunityIcons — the import line is the only thing to change.
