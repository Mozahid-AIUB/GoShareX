<div align="center">

<img src="assets/images/gosharex-logo-transparent.png" alt="GoShareX logo" width="120" />

# GoShareX

**Share the ride, split the fare — a ride-sharing app for AIUB students.**

[![Get it on Google Play](https://img.shields.io/badge/Google_Play-Download-34A853?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.gosharex.app)
![Expo SDK 54](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![React Native 0.81](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Realtime-3FCF8E?logo=supabase&logoColor=white)

</div>

---

## About

Students heading the same way often pay for separate rickshaws or CNGs. GoShareX finds verified
AIUB students nearby who are going to the same destination, lets them chat and agree on a ride,
and splits the fare automatically.

## Features

- **Nearby rider matching** — see students near you heading to the same destination, ranked by
  distance, rating and pickup point.
- **Live map** — your position, matched riders, pickup and destination with route preview.
- **Real-time chat** — message a matched rider before and during a trip. Messages expire after
  24 hours, and anonymous chats after 10 minutes.
- **Full ride flow** — request, confirm, ride and complete, with automatic completion when you
  arrive at the destination.
- **Fare splitting** — fair split between co-riders, with savings tracked on your profile.
- **Ratings & trust** — star ratings, trust score and badges, with suspensions for repeated
  cancellations or misconduct.
- **Ride board** — post where you're going and let others join.
- **Share your ride** — send trip details to a friend for safety.
- **Push notifications** — ride requests, confirmations and chat messages.
- **Bangla & English** — full bilingual UI.
- **Privacy first** — location is used only while the app is open, never in the background.

## Tech stack

| Layer | Technology |
| --- | --- |
| App | React Native 0.81, Expo SDK 54, TypeScript, React 19 |
| State & navigation | Zustand, React Navigation 7 |
| Maps & location | react-native-maps, Expo Location, Google Maps Platform, OpenStreetMap (Photon, GraphHopper) |
| Backend | Supabase (Postgres, Auth, Realtime, Row Level Security, Edge Functions) |
| Auth & messaging | Google Sign-In, Expo Notifications, Firebase |
| Build & release | EAS Build, EAS Update |
| Testing & quality | Jest, ESLint, Prettier |

## Getting started

### Prerequisites

- Node.js 20 or newer
- An Android device or emulator (or iOS with a Mac)
- A Supabase project and Google Maps Platform API keys
- [EAS CLI](https://docs.expo.dev/eas/) for building: `npm install -g eas-cli`

### Setup

```bash
git clone https://github.com/Mozahid-AIUB/GoShareX.git
cd GoShareX
npm install
cp .env.example .env   # then fill in your keys
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase backend |
| `FIREBASE_*` | Firebase configuration (see `.env.example`) |
| `GOOGLE_WEB_CLIENT_ID` | Google Sign-In |
| `GOOGLE_MAPS_API_KEY` | Maps SDK; also used as the fallback for the keys below |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_ROUTES_API_KEY`, `GOOGLE_DIRECTIONS_API_KEY`, `GOOGLE_DISTANCE_MATRIX_API_KEY` | Optional per-API keys |
| `GRAPHHOPPER_API_KEY` | OpenStreetMap routing |

Never commit `.env`. It is already listed in `.gitignore`.

### Database

Apply the SQL migrations in [`supabase/migrations`](supabase/migrations) in order. They create the
schema, Row Level Security policies, realtime channels and cleanup jobs. Edge Functions for push
notifications, rating reminders and welcome emails live in [`supabase/functions`](supabase/functions).

### Run

```bash
npm start            # Expo dev server
npm run android      # build and run on Android
npx expo start --web # quick preview in the browser
```

Native modules (maps, Google Sign-In) need a development build, not Expo Go.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Build and run natively |
| `npm run test:ci` | Run tests with coverage |
| `npm run check` | Type-check, lint and format check |
| `npm run build:android` | Production build with EAS |
| `npm run build:preview` | Installable preview APK |

## Project structure

```text
src/
├── screens/      UI screens (auth, home, map, ride, chat, board, profile, admin)
├── components/   Reusable UI components
├── services/     Supabase, Google, OSM and location services
├── store/        Zustand stores
├── hooks/        Screen logic and wiring
├── navigation/   Route definitions
├── i18n/         Bangla and English translations
├── config/       Runtime config and feature flags
├── constants/    Destinations, fares and static data
├── types/        Shared TypeScript types
└── utils/        Pure helpers (distance, validation, formatting)
supabase/         SQL migrations and Edge Functions
plugins/          Expo config plugins
docs/             Architecture notes and the privacy policy site
```

More detail is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Privacy

GoShareX collects location only while the app is in use. Before asking for permission, it shows
a clear notice explaining why. Location is shared with nearby riders for matching and with your
confirmed ride partner during a trip. Read the full
[privacy policy](https://mozahid-aiub.github.io/GoShareX/).

## Contributing

Bug reports and suggestions are welcome through
[GitHub Issues](https://github.com/Mozahid-AIUB/GoShareX/issues). For code changes, open an issue
first to discuss the change, and run `npm run check` before submitting a pull request.

## Author

Built by **[Mozahid](https://github.com/Mozahid-AIUB)**.

---

<div align="center">

© 2026 GoShareX. All rights reserved.

</div>
