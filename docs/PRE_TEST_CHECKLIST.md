# Pre-Test / Pre-Build Checklist

> **READ ME** before you run `npx expo prebuild` or push to EAS Build.
> These are setup steps that must happen **once**, manually, outside of normal dev cycles.

Last updated: 2026-05-24

---

## 🔴 Critical — Will Break Without These

### 1. Firebase Storage Rules deploy

Storage rules in `firebase/storage.rules` aren't auto-deployed from the app.
Profile photo uploads (and any future Storage writes) will **fail** until you push them.

```bash
firebase deploy --only storage
```

Verify in Firebase Console → Storage → Rules tab.

---

### 2. Firebase Cloud Functions deploy

All 14 functions in `functions/src/` are local source only. The 2-hour rating reminder, FCM push handlers, cleanup jobs, audit logs — none of them fire in production until deployed.

```bash
cd functions
npm install              # first time
npm run build
firebase deploy --only functions
cd ..
```

Verify in Firebase Console → Functions → list should show all 14:
`onRideConfirmed`, `onRideComplete`, `onRideCompleted`, `penaltyCheck`,
`onPenaltyCheck`, `cleanupInactiveRiders`, `autoExpirePosts`,
`cleanupAnonymousChats`, `scheduledCleanup`, `processAuditLog`,
`rideRatingReminder`, `scheduledRatingReminder`, plus any newly added.

---

### 3. Firestore Rules deploy (if you've changed them)

```bash
firebase deploy --only firestore:rules
```

### 4. Realtime Database Rules deploy

Presence and live rider tracking use Firebase Realtime Database. Those writes
will fail with `permission_denied` until RTDB rules are deployed.

```bash
firebase deploy --only database
```

---

### 5. App Icon + Adaptive Icon PNGs

Source SVGs live in `assets/brand/`. The actual PNGs Expo consumes in
`assets/images/` are still the old empty placeholders until you regenerate.

```bash
# One-time install
npm install --save-dev sharp

# Generate PNGs from SVG
node scripts/build-icons.js
```

Or use https://cloudconvert.com/svg-to-png manually:
- `assets/brand/icon.svg` → 1024×1024 → save as `assets/images/icon.png`
- `assets/brand/adaptive-icon-foreground.svg` → 1024×1024 → save as `assets/images/adaptive-icon.png`

---

## 🟡 Important — Quality Issues

### 6. Real-device push notification test

FCM push notifications don't work in Expo Go. Verify via EAS preview build:

```bash
eas build --profile preview --platform android
# Install the .apk on real device
# Trigger a ride request — partner should receive FCM push
```

### 7. Map API key restrictions

In Google Cloud Console, make sure:
- `GOOGLE_MAPS_API_KEY` is restricted to `com.gosharex.app` package name + SHA-1 cert
- Other Google API keys (Places, Routes, etc.) have same restrictions
- Otherwise leaked keys can be abused

### 8. Image-picker dependency removal (optional cleanup)

We removed the photo upload feature but `expo-image-picker` is still in
package.json. Either:
- Keep it (small bundle cost, future-proof)
- Remove: `npm uninstall expo-image-picker`

---

## 🟢 Polish — Won't Block Launch

### 9. npm audit

```bash
npm audit
# 22 vulnerabilities (1 high) as of last check
# `npm audit fix --force` may break things — read each warning first
```

### 10. Skip Bangla localization audit

`src/i18n/locales/bn.ts` is partial — many strings are still English.
Mixed-language UX is intentional for Bangladeshi users; complete only
if you decide to offer a full language switch in Settings.

---

## 📋 Pre-Build Smoke Test

After steps 1-4, run this on a real device to verify everything works:

- [ ] Sign in with Google (or email + password if testing that path)
- [ ] Profile shows your name + Google photo
- [ ] Edit Profile screen loads, name save works
- [ ] Settings: Map Appearance, Biometric lock, Terms & Privacy all open
- [ ] HomeScreen: pickup auto-set to "My current location"
- [ ] Pick a destination → map shows route preview
- [ ] LiveMap: scan chip, speedometer, marker visible at correct positions
- [ ] Wait 15s → No Riders sheet pops up with bouncy animation
- [ ] Retry / Wait / Post request buttons have haptic feedback
- [ ] Chats tab: Find 1:1 + Join Group buttons work
- [ ] Two phones: 1v1 chat matches, both auto-navigate, Leave button works
- [ ] 1v1 chat ends after 5 min (set chat duration to 30s temporarily to verify)
- [ ] Group chat: 3 phones, all see system messages, 10-person cap holds
- [ ] Ride complete → Rating screen with 5 stars + 2 chips + comment
- [ ] 2 hours later → push notification "Help keep our community clean"
- [ ] Status bar icons visible on all screens (Home dark, Map/Chat light)
- [ ] Tab bar labels centered, gesture-bar clearance present
- [ ] No console.warn or error spam in Metro logs
