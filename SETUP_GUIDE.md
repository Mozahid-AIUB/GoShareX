# RideShare AIUB Setup Guide

This guide reflects the current workspace as it exists today, including the Google API service layer and the current Expo-based config flow.

## 1. Install Dependencies

```bash
npm install
```

## 2. Firebase Setup

### 2.1 Create a Firebase project

1. Open `https://console.firebase.google.com`
2. Create a project for RideShare AIUB
3. Enable Google Analytics only if you want it for this project

### 2.2 Enable Firebase products

Enable these services:

- Authentication with `Email/Password`
- Firestore
- Realtime Database
- Cloud Messaging
- Storage

### 2.3 Add Android app

Use the Android package from the current Expo config:

- package name: `com.aiub.rideshare`

Then download `google-services.json` and place it in the project root path currently referenced by Expo:

- [google-services.json](/d:/Way_To_Job/GoShareX/google-services.json)

Current reference:
- [app.json](/d:/Way_To_Job/GoShareX/app.json)

## 3. Google Maps Platform Setup

Open `https://console.cloud.google.com` and enable the APIs the workspace already supports:

- `Maps SDK for Android`
- `Maps SDK for iOS`
- `Places API`
- `Distance Matrix API`
- `Directions API`
- `Routes API`

The app can run with:

- one shared key via `GOOGLE_MAPS_API_KEY`

or

- split keys via `GOOGLE_PLACES_API_KEY`
- `GOOGLE_DISTANCE_MATRIX_API_KEY`
- `GOOGLE_DIRECTIONS_API_KEY`
- `GOOGLE_ROUTES_API_KEY`

Recommended restriction strategy:

- application restriction for Android package `com.aiub.rideshare`
- API restrictions limited to only the APIs you enabled

## 4. Environment Variables

Copy the example file:

```bash
Copy-Item .env.example .env
```

Then fill in values in [.env](/d:/Way_To_Job/GoShareX/.env).

### Important runtime note

The current app reads config from Expo `extra` through [src/config/env.ts](/d:/Way_To_Job/GoShareX/src/config/env.ts).

That means:

- documenting keys in `.env` is useful
- but the values must also be available to Expo config in your workflow
- Firebase runtime values are currently hardcoded in `env.ts` and also partially present in `app.json`

Documented variables:

```env
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=

GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=
GOOGLE_ROUTES_API_KEY=
GOOGLE_DIRECTIONS_API_KEY=
GOOGLE_DISTANCE_MATRIX_API_KEY=

APP_ENV=development
APP_VERSION=1.0.0
API_TIMEOUT=30000
ENABLE_ANALYTICS=true
ENABLE_CRASHLYTICS=true
ENABLE_PERFORMANCE_MONITORING=true
LOCATION_UPDATE_INTERVAL=5000
PROXIMITY_RADIUS_METERS=30
GEOFENCE_RADIUS_METERS=100
RIDE_CONFIRMATION_TIMEOUT_SECONDS=30
RIDE_WAITING_TIMEOUT_MINUTES=10
AUTO_CANCEL_INACTIVE_MINUTES=5
NOTIFICATION_SOUND_ENABLED=true
VIBRATION_ENABLED=true
HIGH_PRIORITY_NOTIFICATIONS=true
```

## 5. What Is Already Wired In Code

### Google-backed services

- Places autocomplete service
- Distance Matrix service
- Directions service
- Routes service

Source files:

- [src/services/google/placesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/placesService.ts)
- [src/services/google/distanceMatrixService.ts](/d:/Way_To_Job/GoShareX/src/services/google/distanceMatrixService.ts)
- [src/services/google/directionsService.ts](/d:/Way_To_Job/GoShareX/src/services/google/directionsService.ts)
- [src/services/google/routesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/routesService.ts)

### Current UI usage

- Home destination search uses `Places API`
- Home partner ranking uses `Distance Matrix API`

Not fully consumed everywhere yet:

- meetup route UX for `Directions API`
- ride route and fare UX for `Routes API`

## 6. Start The App

```bash
npm start
```

Android:

```bash
npm run android
```

iOS:

```bash
npm run ios
```

## 7. Known Workspace Caveats

- `app.json` still has a placeholder EAS project ID
- some native Firebase and notification packages are referenced in the codebase but may not be installed in the current workspace
- because of that, `npm run type-check` may still fail for reasons unrelated to Google API setup

## 8. Troubleshooting

### Maps not loading

- confirm the key is valid
- confirm `Maps SDK for Android` is enabled
- confirm your key restrictions allow package `com.aiub.rideshare`
- confirm the key is actually available to Expo config at runtime

### Places autocomplete not returning results

- confirm `Places API` is enabled
- confirm billing is enabled on the Google Cloud project if required by Google
- confirm `GOOGLE_PLACES_API_KEY` or fallback `GOOGLE_MAPS_API_KEY` is available

### Partner distance not updating

- confirm `Distance Matrix API` is enabled
- confirm location permission is granted

### Directions or Routes calls fail

- confirm `Directions API` and `Routes API` are both enabled
- confirm the key you are using is restricted to include those APIs
