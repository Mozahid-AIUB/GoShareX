# GoShareX — System Design (Enterprise Architecture)

> Companion document to [PREMIUM_ROADMAP.md](PREMIUM_ROADMAP.md).
> This doc describes **how** the premium features are built, not **what** to build.

---

## 1. High-Level Architecture

```
+------------------------------------------------------------+
|                    MOBILE CLIENT (RN/Expo)                 |
|                                                            |
|  Screens  ->  Hooks  ->  Services  ->  Stores (Zustand)    |
|                            |                               |
|                            v                               |
|             +----------------------------+                 |
|             |    SERVICE PROXY LAYER     |                 |
|             |  (Cloud Functions HTTPS)   |                 |
|             +----------------------------+                 |
+------------|-----------------------------|-----------------+
             |                             |
             v                             v
   +-------------------+         +--------------------+
   |  GOOGLE APIs (22) |         |   FIREBASE BACKEND |
   |                   |         |                    |
   | - Maps SDK        |         | - Auth             |
   | - Places          |         | - Firestore        |
   | - Routes          |         | - Realtime DB      |
   | - Roads           |         | - Storage          |
   | - Static Maps     |         | - FCM              |
   | - Street View     |         | - Cloud Functions  |
   | - 3D / Aerial     |         | - Analytics        |
   | - + 15 more       |         |                    |
   +-------------------+         +--------------------+
```

**Key principle:** Client never calls expensive Google APIs directly. All requests flow through Cloud Functions which:
1. Inject the API key server-side (secure)
2. Apply per-user rate limiting
3. Cache responses in Firestore
4. Return enriched / filtered data

---

## 2. Service Layers (Client)

### Layer 1 — Presentation (`src/screens/`, `src/components/`)
Pure UI. No direct API calls. Subscribe to stores, dispatch hooks.

### Layer 2 — Hooks (`src/hooks/`)
React-flavored interfaces over services. Handle lifecycle, cleanup, loading states.

```typescript
// Example pattern
export function useNearbyRiders(destination, enabled) {
  // subscribe -> matchingService
  // returns { riders, loading, error }
}
```

### Layer 3 — Services (`src/services/`)
Pure business logic, no React. Organized by domain:

```
src/services/
├── firebase/     # Auth, Firestore, RTDB, Storage operations
├── google/       # All 22 Google APIs (via proxy)
├── location/     # GPS, geofence, movement
├── notifications/# Local + FCM push
├── analytics/    # Event tracking
└── search/       # History, suggestions
```

### Layer 4 — Stores (`src/store/`)
Zustand global state. Persists where needed. Reactive.

```
authStore       - current user, session
locationStore   - current GPS, pickup
rideStore       - active ride state, vehicle config
chatStore       - active chats, unread
postStore       - board posts
notificationStore - in-app notifications
uiStore         - modals, toasts, theme
```

---

## 3. Backend Architecture (Firebase + Cloud Functions)

### Data Layer Split

| What | Where | Why |
|---|---|---|
| User profiles, rides, posts, chats | **Firestore** | Strong consistency, complex queries |
| Live rider location, presence | **Realtime DB** | Sub-second sync, simple key-value |
| Profile photos, evidence pics | **Storage** | Binary data, CDN delivery |
| Auth | **Firebase Auth** | Managed identity |
| Push tokens | **Firestore `fcm_tokens/{uid}`** | Owner-only access |

### Cloud Functions Map

```
HTTPS (called from client):
  proxyGoogleApi/*          - All Google API calls go through here
  generateShareLink         - Create signed ride share URL
  submitReport              - User reports another user

Firestore Triggers:
  onRideComplete            - Update stats, trigger rating reminder
  onRideCompleted           - Cleanup RTDB, send notifications
  onRideConfirmed           - Notify second rider via FCM
  onPenaltyCheck            - Increment strikes, suspend if needed
  onUserReport              - Notify admin, auto-suspend if threshold

Realtime DB Triggers:
  (none currently — used for live presence only)

Scheduled (Cron):
  cleanupInactiveRiders     - Remove stale active_riders entries (hourly)
  autoExpirePosts           - Expire posts past their time (every 15m)
  cleanupAnonymousChats     - Delete expired anonymous rooms (every 30m)
  scheduledCleanup          - General housekeeping (daily)
  rideRatingReminder        - Nudge users to rate (hourly)
```

---

## 4. The Google API Proxy Pattern

### Why Proxy?

Client-direct API calls have 3 problems:
1. **API key exposed** in app bundle (extractable even with restrictions)
2. **No central rate limiting** per user
3. **No caching** across users (each device hits API fresh)

### Architecture

```
Client                Cloud Function                    Google API
  |                         |                                 |
  |--- POST /staticMap ---->|                                 |
  |    { route, ... }       |                                 |
  |                         |--- check Firestore cache       |
  |                         |    place_cache/{hash}           |
  |                         |                                 |
  |                         |    HIT?  return cached URL ----|
  |                         |                                 |
  |                         |    MISS?                        |
  |                         |--- check rate limit (user)      |
  |                         |    rate_limits/{uid}_{day}      |
  |                         |                                 |
  |                         |    OK?                          |
  |                         |---fetch with API key ---------->|
  |                         |                                 |
  |                         |<--- response -------------------|
  |                         |                                 |
  |                         |--- write to cache               |
  |                         |--- increment rate limit         |
  |<---- response ----------|                                 |
```

### Implementation Skeleton

```typescript
// functions/src/proxyGoogleApi.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const apiKeys = {
  routes: process.env.GOOGLE_ROUTES_KEY!,
  static: process.env.GOOGLE_STATIC_KEY!,
  // ...
};

export const proxyGoogleApi = onCall(async (request) => {
  const { uid } = request.auth || {};
  if (!uid) throw new HttpsError('unauthenticated', 'Login required');

  const { service, params } = request.data;
  const cacheKey = `${service}:${JSON.stringify(params)}`;

  // 1. Check cache
  const cacheRef = admin.firestore().doc(`api_cache/${hash(cacheKey)}`);
  const cached = await cacheRef.get();
  if (cached.exists && cached.data()!.expiresAt > Date.now()) {
    return cached.data()!.value;
  }

  // 2. Rate limit
  await enforceRateLimit(uid, service);

  // 3. Call Google
  const result = await callGoogle(service, params, apiKeys[service]);

  // 4. Cache
  await cacheRef.set({
    value: result,
    expiresAt: Date.now() + TTL[service],
  });

  return result;
});
```

---

## 5. Data Models (Enhanced for Premium)

### users/{uid} — Extended
```typescript
{
  // existing
  uid, name, email, studentId, department, photoURL,
  rating, totalRides, totalSaved, completionRate,
  badge, strikes, isSuspended,

  // NEW premium fields
  premium: {
    tier: 'free' | 'pro' | 'elite',
    expiresAt: number | null,
    source: 'paid' | 'badge_earned' | 'referral',
  },
  preferences: {
    mapStyle: 'auto' | 'light' | 'dark' | 'its NOT for aiub only general public."
    biometricLock: boolean,
    voiceMessages: boolean,
    shareLocation: boolean,
  },
  trustScore: number,        // 0-100, computed
  verifiedPhone: boolean,
  verifiedStudent: boolean,  // student ID OCR verified
}
```

### rides/{rideId} — Extended
```typescript
{
  // existing
  rider1, rider2, destination, fare, splitAmount, status,
  confirmedAt, startedAt, completedAt, rider1Rating, rider2Rating,

  // NEW
  vehicleType: 'rickshaw' | 'cng' | 'bike',
  riders: string[],          // for group rides (3+ people)
  pickupOrder: string[],     // optimized order from Route Optimization API
  routeSnapshot: {           // saved at start for history
    polyline: string,
    distanceMeters: number,
    durationSeconds: number,
    trafficSegments: [...],  // from Routes API TRAFFIC_ON_POLYLINE
  },
  shareToken: string | null, // for live tracking URL
  staticMapUrl: string,      // cached for history
}
```

### NEW Collections

```
api_cache/{hash}             - Server-side cache of Google responses
place_cache/{placeId}        - Long-lived Place Details cache
rate_limits/{uid}_{yyyymmdd} - Per-user daily call counts
share_tokens/{token}         - Signed URLs for live tracking
referrals/{code}             - User referral codes
premium_subscriptions/{uid}  - Subscription history (audit trail)
```

---

## 6. Real-Time Flows

### Live Marker Movement (Premium Smooth)

```
Phone GPS (1Hz)
  -> locationService.startWatch()
  -> raw point: {lat, lng, accuracy, speed}
  -> snapToRoadsBuffer (collect 5 points)
  -> Roads API snap (every 5s)
  -> snapped points: aligned to road
  -> Animated.spring interpolation
  -> marker.setNativeProps({ coordinate })
  -> 60fps smooth movement
```

### Group Ride Pickup Sequencing

```
Trigger: 3rd user joins a post
  -> Cloud Function: optimizeGroupPickup
  -> Route Optimization API call:
       waypoints: [Main Gate, current_loc_1, current_loc_2, current_loc_3, destination]
       optimize: TRUE
  -> Returns optimal order
  -> Firestore: rides/{rideId}.pickupOrder = [uid1, uid3, uid2]
  -> FCM push to all 3: "Pickup sequence updated"
  -> Chat message: "Order: Mozahid -> Sakib -> Tania"
  -> Fare split by leg distance contribution
```

### Live Share Link Flow

```
User taps "Share live ride"
  -> Client calls Cloud Function: generateShareLink({rideId})
  -> Function:
       - Verify caller is ride participant
       - Generate signed token: jwt({ rideId, exp: rideEnd + 5min })
       - Store in share_tokens/{token}
       - Return shareUrl: https://gosharex.app/track/{token}
  -> User shares via WhatsApp
  -> Recipient opens link
  -> Server-side render: HTML with Maps Embed API
       - Reads current rider location from RTDB
       - Auto-refreshes every 10s
  -> When ride completes, link expires
```

---

## 7. Premium Tier Enforcement

### Client-Side Gates
```typescript
// src/hooks/usePremium.ts
export function usePremium() {
  const { user } = useAuthStore();
  const tier = user?.premium?.tier ?? 'free';
  const isPremium = tier === 'pro' || tier === 'elite';

  return {
    tier,
    isPremium,
    canUseAerialView: isPremium,
    canUseVoiceMessages: isPremium,
    canUseUnlimitedHistory: isPremium,
    canUsePriorityMatching: tier === 'elite',
    extendedRadiusMeters: isPremium ? 50 : 30,
  };
}
```

### UI Pattern for Premium Features

```typescript
function AerialViewButton() {
  const { canUseAerialView } = usePremium();

  if (!canUseAerialView) {
    return <PremiumLockBadge feature="3D Aerial View" />;
  }

  return <Button onPress={openAerialView} label="3D Preview" />;
}
```

### Server-Side Verification
Premium features that cost API quota must verify on the server too:

```typescript
// Cloud Function
if (action === 'aerialView' && !isPremium(user)) {
  throw new HttpsError('permission-denied', 'Premium required');
}
```

---

## 8. Security Model

### Threat Matrix

| Threat | Mitigation |
|---|---|
| Stolen API key from APK | Proxy through Cloud Functions, restrict by package name + SHA-1 |
| Quota burn by malicious user | Per-user daily rate limit in Firestore |
| Fake ratings | One rating per ride, server-validated `raterId === auth.uid` |
| Spam reports | Min description length, rate limit, admin review queue |
| Profile pic abuse | Cloud Function `onStorageUpload` validates image, runs SafeSearch |
| Live location stalking | Only share live coords with confirmed ride partner |
| Token replay (share links) | JWT with short expiry, revoke on ride complete |
| Suspension bypass | `isNotSuspended()` check in every Firestore rule |

### Audit Trail
Every sensitive action writes to `audit_logs/`:
- Rating submission (raterId, targetId, stars, timestamp)
- Report submission (reporterId, targetId, reason)
- Suspension (adminId or 'system', targetId, reason, duration)
- Premium tier change (uid, oldTier, newTier, source)

---

## 9. Performance Targets

| Metric | Target | Current |
|---|---|---|
| App cold start | < 2.5s | ~3s |
| HomeScreen first paint | < 1s after auth | OK |
| Marker update latency | < 200ms | OK |
| Map render with 20 markers | 60fps | OK |
| FCM delivery (foreground) | < 500ms | OK |
| Routes API p95 | < 800ms | unknown — needs measurement |
| Static Map cache hit rate | > 80% | not yet implemented |

---

## 10. Testing Strategy

### Unit (Jest)
- Pure functions: fareTable, haversine, validators, formatters
- Service methods with mocked Firebase / fetch
- Reducers / store slices

### Integration
- Auth flow end-to-end (real Firebase test project)
- Ride lifecycle (create -> confirm -> complete)
- Chat send/receive
- Place search + select

### E2E (Detox)
- Critical paths only:
  1. Login -> Home -> Pick destination -> See riders
  2. Request ride -> Chat -> Confirm deal -> Complete ride -> Rate
  3. Create post -> Other user joins -> Group chat

### Manual / Beta
- 5-10 AIUB students test for 2 weeks before each release
- Weekly feedback survey

---

## 11. Observability

### Logging
- All client errors -> Firestore `error_reports/`
- All server errors -> Cloud Logging (auto)
- Custom events -> Firebase Analytics

### Metrics Dashboard (Firebase Console + custom)
- Daily Active Users
- Rides started / completed / cancelled
- Average match time
- Premium conversion rate
- API quota usage per service
- Error rate per screen

### Alerts
- Crash rate > 1% -> Slack
- API quota > 80% -> Slack
- Suspicious activity (10+ reports in 1h) -> admin email
- Premium payment failure -> user email + Slack

---

## 12. Deployment Pipeline

```
Local Dev
  -> npm run type-check && npm run lint
  -> Manual smoke test
  -> git commit
  -> git push

CI (GitHub Actions — to be set up):
  -> npm install
  -> npm run check (type + lint + format)
  -> npm run test:ci
  -> EAS build (preview)
  -> Notify Slack

Staging:
  -> EAS internal distribution
  -> Real Firebase staging project
  -> 5 beta users

Production:
  -> EAS production build
  -> Submit to Play Store
  -> Cloud Functions deploy
  -> Firestore rules deploy
  -> Monitor for 24h
```

---

## 13. File Structure (Target)

```
src/
├── api/                          # HTTP client wrapper
├── assets/
├── components/
│   ├── common/                   # Shared atoms
│   ├── features/                 # Feature-scoped components
│   └── premium/                  # Premium-only UI (3D, etc.)
├── config/
├── constants/
├── design/                       # Design tokens, theme
├── hooks/
│   ├── auth/
│   ├── ride/
│   ├── chat/
│   └── premium/                  # usePremium, useGateFeature
├── i18n/
├── navigation/
├── screens/
│   ├── auth/
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   ├── components/
│   │   └── utils/
│   ├── map/
│   ├── chat/
│   ├── ride/
│   ├── board/
│   ├── profile/
│   ├── premium/                  # NEW — subscription screens
│   └── admin/
├── services/
│   ├── firebase/
│   ├── google/                   # Proxy clients
│   ├── location/
│   ├── notifications/
│   ├── analytics/
│   ├── premium/                  # NEW — subscription logic
│   └── search/
├── store/
├── types/
└── utils/

functions/                         # Cloud Functions
├── src/
│   ├── proxies/                  # Google API proxies
│   ├── triggers/                 # Firestore triggers
│   ├── scheduled/                # Cron jobs
│   ├── premium/                  # Subscription webhooks
│   └── admin/                    # Admin endpoints
```

---

## 14. Migration Checklist (When Building Each Phase)

For every new feature, ensure:

- [ ] Service layer created (not just inline in screen)
- [ ] Caching strategy chosen (memory / AsyncStorage / Firestore)
- [ ] Error handling with `logger.error()`
- [ ] Loading + empty states in UI
- [ ] TypeScript types exported
- [ ] No `any` types
- [ ] No `console.log` (use `logger`)
- [ ] Analytics events added
- [ ] Firestore rules updated if new collection
- [ ] Cloud Function added if API key exposure risk
- [ ] Rate limit added if user-triggered
- [ ] Documentation updated in this file
- [ ] At least one unit test for the service

---

*This document is the technical contract. PREMIUM_ROADMAP.md is the product vision. Read both before starting any premium phase.*
