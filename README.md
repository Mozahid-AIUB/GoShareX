# RideShare AIUB

RideShare AIUB is a React Native and Expo app for AIUB students to find nearby rickshaw partners, coordinate quickly, and split fares with less friction.

## Scenario

The product is centered on one short, repeatable flow:

1. Open the app near AIUB.
2. Confirm your pickup point.
3. Choose a destination.
4. See nearby students going the same way.
5. Send a request or open chat.
6. Meet up and share the ride.

The current home experience is already shaped around that scenario, rather than being a generic transport marketplace.

## Current API-Backed Implementation

The workspace now contains a reusable Google service layer and partial UI integration for it.

### Google APIs in code

- `Maps SDK for Android` and `Maps SDK for iOS`
- `Places API`
- `Distance Matrix API`
- `Directions API`
- `Routes API`

### Firebase services in code

- Firebase Authentication
- Firestore
- Realtime Database
- Firebase Storage
- Firebase Cloud Messaging
- Firebase Analytics wrapper
- Firebase Crashlytics wrapper

## What Is Implemented Today

### Home flow

The home screen follows the README scenario and acts as the current product entry point:

- live campus-style hero
- pickup-point-first flow
- quick destination selection
- Google Places-backed destination search
- live partner feed
- request state progression in shared store
- request preview sheet before jumping into chat or map

Key file:
- [src/screens/home/HomeScreen.tsx](/d:/Way_To_Job/GoShareX/src/screens/home/HomeScreen.tsx)

### Google API usage

The current codebase includes dedicated service modules for:

- [src/services/google/placesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/placesService.ts)
- [src/services/google/distanceMatrixService.ts](/d:/Way_To_Job/GoShareX/src/services/google/distanceMatrixService.ts)
- [src/services/google/directionsService.ts](/d:/Way_To_Job/GoShareX/src/services/google/directionsService.ts)
- [src/services/google/routesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/routesService.ts)

What is already connected in UI:

- `Places API` for home destination autocomplete
- `Distance Matrix API` for partner distance and ranking on the home screen

What is scaffolded in services but not yet fully consumed across the app:

- `Directions API` for meetup walking routes
- `Routes API` for fare-aware route previews and ride routing

## Environment And Runtime Notes

The environment story in this repo is important:

- Google API keys are read from Expo `extra` via `src/config/env.ts`
- The app supports one shared `GOOGLE_MAPS_API_KEY` or separate keys per Google API
- Firebase values are currently hardcoded in `src/config/env.ts` for runtime and are also present in `app.json`
- `.env.example` documents the expected Google and app-level keys, but the app does not automatically load `.env` by itself unless those values are also exposed through Expo config in your workflow

Primary config files:

- [src/config/env.ts](/d:/Way_To_Job/GoShareX/src/config/env.ts)
- [app.json](/d:/Way_To_Job/GoShareX/app.json)
- [.env.example](/d:/Way_To_Job/GoShareX/.env.example)

### Documented environment variables

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

## Setup Summary

1. Install dependencies with `npm install`.
2. Add your Firebase project files and credentials.
3. Create a Google Maps key, or split keys per API if you prefer.
4. Make those Google keys available to Expo config so `src/config/env.ts` can read them.
5. Start the app with `npm start` or run Android with `npm run android`.

Detailed setup:
- [SETUP_GUIDE.md](/d:/Way_To_Job/GoShareX/SETUP_GUIDE.md)
- [docs/MAPS_SETUP.md](/d:/Way_To_Job/GoShareX/docs/MAPS_SETUP.md)
- [docs/FIREBASE_SETUP.md](/d:/Way_To_Job/GoShareX/docs/FIREBASE_SETUP.md)

## Architecture Snapshot

### Client layer

- React Native
- Expo
- TypeScript
- React Navigation
- Zustand
- React Native Paper

### Service layer

- authentication
- location
- matching
- chat
- ride
- notification
- Google API service modules

### Data layer

- Firebase Authentication
- Firestore
- Realtime Database
- Firebase Storage
- Firebase Cloud Messaging

## Implementation Reality

Implemented well enough to demo:

- auth flow
- bottom tab navigation
- home screen scenario-first UI
- partner request state in store
- Google Places destination search
- Google Distance Matrix-backed partner ranking

Still in progress:

- full `Directions API` usage in meetup UI
- full `Routes API` usage in ride preview and map flow
- broader live map and ride lifecycle wiring
- dependency cleanup for some native Firebase and notification packages

## Quick Start

```bash
npm install
npm start
npm run android
```

## Notes

- `app.json` still contains a placeholder EAS project ID.
- Type-check may still fail in this workspace because some native packages are referenced but not installed.
- The docs now reflect the current API-backed implementation more closely than the older vision-heavy README.
`