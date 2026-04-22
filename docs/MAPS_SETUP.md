# Maps Setup

This project already contains a Google API service layer and partial UI integration for it.

## APIs Supported By The Workspace

- `Maps SDK for Android`
- `Maps SDK for iOS`
- `Places API`
- `Distance Matrix API`
- `Directions API`
- `Routes API`

## Keys

You can configure the app with:

- one shared key through `GOOGLE_MAPS_API_KEY`

or

- separate keys for:
`GOOGLE_PLACES_API_KEY`
`GOOGLE_DISTANCE_MATRIX_API_KEY`
`GOOGLE_DIRECTIONS_API_KEY`
`GOOGLE_ROUTES_API_KEY`

The current fallback logic is defined in [src/config/env.ts](/d:/Way_To_Job/GoShareX/src/config/env.ts).

## Current Usage In The App

Already used in UI:

- `Places API` on the home screen for destination autocomplete
- `Distance Matrix API` on the home screen for partner distance and ranking

Available in services but still being integrated more broadly:

- `Directions API`
- `Routes API`

## Setup Checklist

1. Enable the APIs in Google Cloud.
2. Create or copy an API key.
3. Restrict the key by Android app package when possible.
4. Add the key values to your config flow.
5. Restart Metro after changing config.

## Related Files

- [src/services/google/base.ts](/d:/Way_To_Job/GoShareX/src/services/google/base.ts)
- [src/services/google/placesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/placesService.ts)
- [src/services/google/distanceMatrixService.ts](/d:/Way_To_Job/GoShareX/src/services/google/distanceMatrixService.ts)
- [src/services/google/directionsService.ts](/d:/Way_To_Job/GoShareX/src/services/google/directionsService.ts)
- [src/services/google/routesService.ts](/d:/Way_To_Job/GoShareX/src/services/google/routesService.ts)
- [.env.example](/d:/Way_To_Job/GoShareX/.env.example)
