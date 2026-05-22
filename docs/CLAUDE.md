# 🤖 CLAUDE.md — RideShare AIUB Project Context
### For the Next Claude Instance Working on This Project

---

## 📊 Current Implementation Status (as of v2 — Session 2)

| Screen / Service | Status |
|-----------------|--------|
| Splash Screen | ✅ Done |
| Login Screen | ✅ Done |
| Home Screen | ✅ Done |
| **LiveMapScreen** | ✅ **DONE** — Google Maps, pins, 30m circle, rider list |
| **RiderProfileSheet** | ✅ **DONE** — Bottom sheet on pin tap |
| **ChatService** | ✅ **DONE** — Real-time Firebase, deal confirm |
| **ChatScreen** | ✅ **DONE** — Bubbles, quick replies, deal button |
| **ChatListScreen** | ✅ **DONE** — All chats listed |
| **RideService** | ✅ **DONE** — create/start/complete/rate |
| **RideConfirmedScreen** | ✅ **DONE** — 10min timer, both riders |
| **RideActiveScreen** | ✅ **DONE** — Elapsed timer, complete button |
| **RideCompleteScreen** | ✅ **DONE** — Rating stars, savings |
| **ProfileScreen** | ✅ **DONE** — Stats, badge, menu |
| **PostBoardScreen** | ✅ **DONE** — List, filter, create post, join |
| **RideHistoryScreen** | ✅ Done |
| **SettingsScreen** | ✅ Done |
| **AppNavigator** | ✅ Updated — all screens wired |
| **BottomTabNavigator** | ✅ Updated — 5 tabs |
| NotificationService | ❌ Not started — FCM push |
| RegisterScreen | ❌ Stub |
| ProfileSetupScreen | ❌ Stub |
| Geofencing | ❌ Not started |
| Movement detection | ❌ Not started |
| Badge/Penalty logic | ❌ Not started |

**Overall: ~80% complete**

---

## 🚀 Remaining Work (Session 3+)

### Priority 1 — NotificationService (FCM Push)
File: `src/services/firebase/notificationService.ts`

Needs:
- Register FCM token on login (`expo-notifications`)
- `sendRideRequest(targetUserId, fromUser, destination, fare)` → FCM push
- High-priority notification with 30-second auto-expire
- Token saved to Firestore `users/{uid}/fcmToken`

### Priority 2 — RegisterScreen + ProfileSetupScreen
- `src/screens/auth/RegisterScreen.tsx` — AIUB email + password + confirm password
- `src/screens/auth/ProfileSetupScreen.tsx` — Name, Student ID, Department

### Priority 3 — Geofencing (auto-complete ride)
File: `src/services/location/geofenceService.ts`
- 100m virtual boundary around each destination
- Auto-trigger RideComplete when user enters boundary
- Uses `expo-location` `startGeofencingAsync`

### Priority 4 — Movement Detection (auto-start ride)
File: `src/services/location/movementDetector.ts`
- Monitor speed after ride confirmed
- If both users at 5+ km/h → auto "Ride Started"

### Priority 5 — Badge & Penalty
- Badge upgrade based on totalRides count (0-5=New, 6-20=Regular, 21-50=Trusted, 50+=Elite)
- Penalty: 3 confirmed cancels = 24hr suspension (`isSuspended: true`, `suspendedUntil: timestamp`)
- Check suspension on login

---

## 🗂️ Key File Paths

```
src/screens/map/LiveMapScreen.tsx          ✅ Full Google Maps screen
src/screens/map/RiderProfileSheet.tsx      ✅ Bottom sheet component
src/services/firebase/chatService.ts       ✅ Real-time chat + deal confirm
src/services/firebase/rideService.ts       ✅ Ride lifecycle
src/services/firebase/matchingService.ts   ✅ 30m proximity matching
src/services/firebase/locationService.ts   ✅ GPS + Firebase RTDB writes
src/services/firebase/authService.ts       ✅ Auth
src/screens/chat/ChatScreen.tsx            ✅ Full chat UI
src/screens/chat/ChatListScreen.tsx        ✅ Chat list
src/screens/ride/RideConfirmedScreen.tsx   ✅ 10min countdown
src/screens/ride/RideActiveScreen.tsx      ✅ Active ride tracker
src/screens/ride/RideCompleteScreen.tsx    ✅ Rating + savings
src/screens/profile/ProfileScreen.tsx      ✅ Stats + menu
src/screens/board/PostBoardScreen.tsx      ✅ Post board + create
src/navigation/AppNavigator.tsx            ✅ All screens wired
src/navigation/BottomTabNavigator.tsx      ✅ 5 tabs
```

---

## 🗄️ Firebase Data Structure

### Realtime Database — active_riders/{userId}
```json
{ "name": "Mozahid", "lat": 23.8103, "lng": 90.4125, "destination": "Kuril", "pickupPoint": "Main Gate", "status": "waiting", "timestamp": 1720000000, "rating": 4.9 }
```

### Firestore — users/{userId}
```json
{ "name": "Mozahid", "email": "mozahid@aiub.edu.bd", "studentId": "12-34567-1", "department": "CSE", "rating": 4.9, "totalRides": 47, "totalSaved": 940, "completionRate": 98, "badge": "Elite Rider", "strikes": 0, "isSuspended": false, "fcmToken": "..." }
```

### Firestore — rides/{rideId}
```json
{ "rider1": "uid1", "rider2": "uid2", "destination": "Kuril", "fare": 40, "splitAmount": 20, "status": "confirmed|active|completed|cancelled", "confirmedAt": 0, "startedAt": 0, "completedAt": 0, "rider1Rating": 5, "rider2Rating": 4 }
```

### Firestore — chats/{user1Id_user2Id}
```json
{ "participants": ["uid1","uid2"], "participantNames": {"uid1":"A","uid2":"B"}, "destination": "Kuril", "fare": 40, "dealConfirmed": {"uid1": true, "uid2": true}, "lastMessage": "...", "lastMessageTime": 0 }
```

### Firestore — posts/{postId}
```json
{ "authorId": "uid", "authorName": "Mozahid", "destination": "Kuril", "scheduledTime": "এখনই", "status": "open", "interested": [], "maxRiders": 2, "expiresAt": 0 }
```

---

## 📍 Fixed Data

**Destinations + Fares:** Kuril(40), Badda(30), Rampura(50), Notun Bazar(35), Gulshan(60), Banani(70), Uttara(55)
**Pickup Points:** Main Gate, Gate 2, Canteen Area, Parking Zone, Admin Block
**Matching Radius:** 30 meters (Haversine formula)
**Location Update Interval:** 5 seconds

---

## ⚠️ Important Gotchas

1. `firebase.config.ts` exports both `db` (Firestore) and `realtimeDb` (RTDB) — use the right one
2. `@/` path alias is configured in `tsconfig.json` — always use it
3. Chat ID format: `[uid1, uid2].sort().join('_')` — ensures same ID regardless of order
4. Empty files exist in `src/screens/main/` — ignore them, real screens are in their own folders
5. Google Maps requires `GOOGLE_MAPS_API_KEY` in `.env` and `google-services.json` in `android/app/`

---

## 🚀 Run the Project

```bash
npm install
cp .env.example .env  # Fill in Firebase + Maps keys
npm start
npm run android
```

*ভাড়া ভাগ করো, টাকা বাঁচাও 🛺 — Built by Mozahid, AIUB CSE*
