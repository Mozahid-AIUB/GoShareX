# 🛺 GoShareX — RideShare AIUB

> **ভাড়া ভাগ করো, টাকা বাঁচাও** — A React Native app for AIUB students to find nearby ride-share partners and split rickshaw fares.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10-ffca28.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

---

## 📱 What It Does

AIUB students opening the app near campus can find others heading the same way within seconds:

1. Confirm pickup point (Main Gate, Gate 2, etc.)
2. Pick a destination (Kuril, Badda, Gulshan, etc.)
3. See live nearby riders within 30 meters
4. Chat, confirm the deal, share the ride, split the fare

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in Firebase + Google Maps API keys

# 3. Start the app
npm start            # Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React Native 0.81, Expo 54, TypeScript 5.9 |
| **Navigation** | React Navigation 7 (Stack + Bottom Tabs) |
| **State** | Zustand (lightweight global stores) |
| **UI** | React Native Paper + custom components |
| **Maps** | Google Maps SDK + react-native-maps |
| **Auth** | Firebase Auth (Gmail-only) |
| **Database** | Firestore + Realtime Database |
| **Push** | Firebase Cloud Messaging + expo-notifications |
| **Location** | expo-location (GPS + geofencing) |

---

## 📂 Project Structure

```
GoShareX/
├── android/                    # Android native build
├── assets/                     # Images, fonts, icons
├── docs/                       # All documentation
│   ├── CLAUDE.md               # AI assistant context
│   ├── SETUP_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── FIREBASE_SETUP.md
│   └── security/               # Security audits & guides
├── firebase/                   # Firebase rules & indexes
├── functions/                  # Cloud Functions
├── scripts/                    # Deploy & seed scripts
├── src/
│   ├── api/                    # HTTP client + endpoints
│   ├── components/             # Reusable UI components
│   │   ├── auth/
│   │   ├── board/
│   │   ├── chat/
│   │   ├── common/             # Button, Input, Toast, etc.
│   │   ├── map/
│   │   └── ride/
│   ├── config/                 # App, Firebase, Maps config
│   ├── constants/              # Colors, spacing, fare table
│   ├── design/                 # Design tokens
│   ├── hooks/                  # Custom React hooks
│   ├── i18n/                   # Translations
│   ├── navigation/             # Stack + tab navigators
│   ├── screens/                # All screens (feature-grouped)
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── home/
│   │   ├── map/
│   │   ├── profile/
│   │   └── ride/
│   ├── services/               # Business logic
│   │   ├── firebase/           # Firestore + Auth + Storage
│   │   ├── google/             # Maps, Places, Routes
│   │   ├── location/           # GPS + geofence
│   │   ├── notifications/      # FCM + local push
│   │   ├── analytics/          # Event tracking
│   │   └── enterprise/         # Rate limit, performance
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helpers (logger, validators)
├── App.tsx                     # Root component
├── index.js                    # RN entry point
├── app.config.js               # Expo config
├── package.json
└── tsconfig.json
```

---

## 🔑 Environment Variables

Create `.env` from `.env.example`:

```env
# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Google Maps (one key for all, OR split per API)
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=
GOOGLE_ROUTES_API_KEY=
GOOGLE_DIRECTIONS_API_KEY=
GOOGLE_DISTANCE_MATRIX_API_KEY=

# Feature flags
ENABLE_ANALYTICS=true
ENABLE_CRASHLYTICS=true
PROXIMITY_RADIUS_METERS=30
GEOFENCE_RADIUS_METERS=100
```

📖 See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full setup.

---

## 📜 NPM Scripts

| Command | What it does |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run start:clear` | Start with cleared cache |
| `npm run android` | Build & run on Android |
| `npm run ios` | Build & run on iOS |
| `npm test` | Run Jest in watch mode |
| `npm run test:ci` | Run tests with coverage |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript compile check |
| `npm run check` | Run all checks (type + lint + format) |
| `npm run build:android` | EAS build (Android) |
| `npm run build:ios` | EAS build (iOS) |
| `npm run build:preview` | Preview APK for testing |

---

## 🗄️ Firebase Data Model

### Realtime Database — `active_riders/{userId}`
```json
{
  "name": "Mozahid",
  "lat": 23.8103,
  "lng": 90.4125,
  "destination": "Kuril",
  "pickupPoint": "Main Gate",
  "status": "waiting",
  "rating": 4.9
}
```

### Firestore — `users/{userId}`
```json
{
  "name": "Mozahid",
  "email": "mozahid@aiub.edu.bd",
  "studentId": "12-34567-1",
  "department": "CSE",
  "rating": 4.9,
  "totalRides": 47,
  "totalSaved": 940,
  "badge": "Elite Rider"
}
```

### Firestore — `rides/{rideId}`, `chats/{chatId}`, `posts/{postId}`
See [docs/CLAUDE.md](docs/CLAUDE.md) for full schema.

---

## 🎯 Features

### ✅ Implemented
- Gmail-only authentication + email verification
- Live map with 30m proximity matching
- Real-time chat with deal confirmation
- Post board (scheduled rides)
- Profile with badge system + ride history
- Settings + privacy policy
- 5-tab bottom navigation

### 🚧 In Progress
- FCM push notifications
- Auto-start (movement detection)
- Auto-complete (geofencing)
- Badge upgrade & penalty system

---

## 🔒 Security

- All API keys via environment variables (no hardcoded secrets)
- Firebase Security Rules enforced on all collections
- Rate limiting on sensitive operations
- Audit logging for ratings & moderation actions
- Biometric authentication ready (expo-local-authentication)

📖 See [docs/security/](docs/security/) for full audit reports.

---

## 🤝 Contributing

This is a private student project. For questions, contact the maintainer.

### Code Standards
- TypeScript strict mode (no `any` allowed in new code)
- Prettier + ESLint enforced
- Use `@/` path alias for src imports
- Use `logger` from `@/utils/logger` (never `console.log`)
- Components < 500 lines (split larger ones)

---

## 📄 License

Private — All rights reserved.

---

**Built with ❤️ by Mozahid · AIUB CSE**
