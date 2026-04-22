# RideShare AIUB - Architecture Overview

## Folder Philosophy

```text
src/
  screens/      -> UI only
  components/   -> reusable UI
  services/     -> Firebase and external API calls
  store/        -> Zustand state
  hooks/        -> screen wiring
  utils/        -> pure helpers
  constants/    -> static data
  types/        -> shared interfaces
  navigation/   -> route definitions
  config/       -> runtime config
```

## Data Flow

```text
Screen
  -> store
  -> services
      -> Firebase
      -> Google APIs
```

## Real-Time Location Pipeline

```text
Expo Location
  -> locationService.ts
      -> Realtime Database: active_riders/{uid}
          -> matchingService
              -> store updates
              -> HomeScreen and LiveMapScreen
```

## Ride Lifecycle

```text
waiting -> request sent -> confirmed -> started -> completed -> rating
```

## Google API Layer

The workspace now includes dedicated service modules under `src/services/google/`.

- `placesService.ts` -> destination autocomplete
- `distanceMatrixService.ts` -> walking distance and ETA ranking
- `directionsService.ts` -> meetup routing support
- `routesService.ts` -> route and fare-oriented routing support

Current UI usage:

- Home screen uses `Places API`
- Home screen uses `Distance Matrix API`

Still being integrated:

- meetup route UX with `Directions API`
- ride route and fare UX with `Routes API`
