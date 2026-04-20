# RideShare AIUB — Architecture Overview

## Folder Philosophy

```
src/
  screens/      → UI only. No business logic.
  components/   → Reusable UI pieces, grouped by domain.
  services/     → All Firebase / external API calls here.
  store/        → Global state (Zustand). One slice per domain.
  hooks/        → Encapsulate service + store wiring. Screens use hooks, not services directly.
  utils/        → Pure functions (no side effects, easily testable).
  constants/    → Static values (routes, config, theme, locations).
  types/        → All TypeScript interfaces. Imported everywhere.
  navigation/   → Route definitions only.
  i18n/         → Bangla + English strings.
  config/       → Environment-specific config.
```

## Data Flow

```
Screen
  └─► Hook (useNearbyRiders, useRideStatus, etc.)
        ├─► Store (Zustand) — for local state reads/writes
        └─► Service (matchingService, rideService, etc.)
              └─► Firebase (Firestore / Realtime DB / FCM)
```

## Real-Time Location Pipeline

```
Expo Location (every 5s)
  └─► locationService.ts
        └─► Firebase RTDB: active_riders/{uid}
              └─► matchingService.subscribeToNearbyRiders()
                    └─► haversine filter (≤300m)
                          └─► rideStore.setNearbyRiders()
                                └─► LiveMapScreen re-renders
```

## Ride Lifecycle

```
waiting → [request sent] → confirmed → [movement detected] → started → [geofence] → completed
                                                                                   → rating
```
