# GoShareX — Premium Enterprise Roadmap

> **Vision:** Transform GoShareX from a student ride-share into a premium, enterprise-grade campus mobility platform that rivals Uber, Pathao, and Grab in technical sophistication — built around AIUB's unique campus context.

**Last updated:** 2026-05-23
**Stack:** React Native 0.81, Expo 54, Firebase 10, 22 Google Maps APIs

---

## 1. Current State Snapshot

### What Works Today
- Gmail-only auth + email verification + suspension system
- Live RTDB matching within 30m radius
- Real-time chat with deal confirmation + anonymous mode
- Post board (scheduled rides)
- Ride lifecycle (confirmed -> active -> complete -> rate)
- 14 Cloud Functions (cleanup, notifications, rating reminders, penalties)
- Firestore security rules (153 lines, fully isolated)
- Production-safe logger
- TypeScript strict mode, 0 errors

### Built But Not Wired
- Biometric authentication
- Firebase Analytics
- Geofencing for auto-complete ride
- Movement detection for auto-start ride
- Profile photo upload
- ReportScreen (TODO placeholder only)

### Missing for Premium
- Real-time turn-by-turn navigation
- Snap-to-road for smooth marker movement
- Static map previews in chat / history
- Street View pickup point previews
- Multi-stop route optimization
- ETA-aware partner matching
- Live ride tracking shareable link
- Traffic-aware fare adjustment
- Offline maps fallback
- Premium tiered access (free vs paid)

---

## 2. The 22 Google APIs — Usage Matrix

| # | API | Status | Premium Use Case | Tier |
|---|---|---|---|---|
| 1 | Maps SDK Android | Used | Native map render | T0 |
| 2 | Maps SDK iOS | Used | Native map render | T0 |
| 3 | Places API | Partial | Add Place Details, Photos, Reviews | T1 |
| 4 | Geocoding API | Reverse only | Forward geocoding for typed addresses | T1 |
| 5 | Distance Matrix | Used | Batch ETA for multiple riders | T1 |
| 6 | Directions API | Partial | Walking route to meetup point | T1 |
| 7 | Routes API | Partial | Traffic-aware ride routing with live updates | T1 |
| 8 | Roads API | UNUSED | Snap GPS to road — eliminate jitter | T1 STAR |
| 9 | Maps Static API | UNUSED | Chat ride previews, history thumbnails, share images | T1 STAR |
| 10 | Street View Static | UNUSED | Pickup point photo previews | T1 STAR |
| 11 | Maps Elevation | UNUSED | Skip (flat city) | — |
| 12 | Route Optimization | UNUSED | Multi-rider carpool pickup order | T2 STAR |
| 13 | Aerial View API | UNUSED | 3D cinematic ride preview | T2 |
| 14 | Maps 3D SDK Android | UNUSED | 3D photorealistic ride animation | T2 |
| 15 | Maps 3D SDK iOS | UNUSED | Same as above | T2 |
| 16 | Map Tiles API | UNUSED | Custom-styled brand map | T2 |
| 17 | Map Management API | UNUSED | Dynamic map style switching | T2 |
| 18 | Maps Datasets API | UNUSED | AIUB campus boundary dataset | T2 |
| 19 | Maps Grounding Lite | UNUSED | LLM-based natural language place search | T3 |
| 20 | Maps JavaScript API | UNUSED | Web admin dashboard | T3 |
| 21 | Maps Embed API | UNUSED | Web shared ride links | T3 |
| 22 | Street View Publish | UNUSED | User-uploaded pickup photos | T3 |

**Tiers:**
- T0 = Foundation (done)
- T1 = Core Premium (Weeks 1-3)
- T2 = Advanced Premium (Weeks 4-6)
- T3 = Future / Optional

---

## 3. Premium Feature Architecture

### A. The Six Premium Pillars

**Pillar 1 — Smooth Tracking**
Replace raw GPS with Roads API snap-to-road + interpolation. Markers glide along roads instead of jittering. This single change makes the app feel 10x more professional.

**Pillar 2 — Visual Context**
Every chat message, history entry, and post card includes a Static Map preview. Pickup points have Street View photo previews so users know "this is the spot". Turns text-heavy screens into glanceable visual cards.

**Pillar 3 — Live Intelligence**
Routes API with TRAFFIC_AWARE_OPTIMAL for real ETAs. Distance Matrix batches all visible riders in one call. Ride flow shows live traffic color overlay (green/yellow/red segments) on the polyline.

**Pillar 4 — Multi-Rider Optimization**
Route Optimization API for carpools with 3+ people. Computes optimal pickup sequence, splits fare proportionally by distance contribution. Unlocks group bookings.

**Pillar 5 — Branded Experience**
Custom map styling via Map Tiles + Map Management APIs. Dark mode, AIUB brand colors, hide unnecessary POIs. Map looks like ours, not generic Google.

**Pillar 6 — Premium Tier**
Free users get standard features. Premium users (paid or earned via Elite Rider badge) get:
- 3D cinematic ride preview (Aerial View + Maps 3D SDK)
- Priority matching (matched first)
- Unlimited ride history
- Voice-to-text chat
- Biometric quick-login
- Live tracking shareable link
- No ads

---

## 4. Phase-by-Phase Implementation Plan

### PHASE 1 — Foundation Fixes (Week 1, ~12h)

Before any premium features, finish what's started.

**1.1 ReportScreen full implementation (3h)**
- Form: report type, target user (optional), description, evidence photo
- Submit to `reports` collection
- Cloud Function `onUserReport` to notify admin
- Auto-strike if 3+ reports against same user

**1.2 Firebase Analytics wiring (1h)**
- `trackScreen()` in every screen mount
- Events: ride_requested, ride_confirmed, ride_completed, ride_cancelled, chat_opened, post_created, post_joined, rating_submitted
- User properties: badge, totalRides, totalSaved

**1.3 Profile photo upload (3h)**
- ImagePicker -> crop -> upload to Storage
- Update `photoURL` in user doc
- Display in ProfileScreen, RiderCard, ChatBubble

**1.4 Wire geofencing for auto-complete (2h)**
- Already coded in `geofenceService.ts`
- Hook into RideActiveScreen useEffect
- 100m circle around destination triggers complete

**1.5 Wire movement detection for auto-start (1h)**
- Already coded in `movementDetector.ts`
- Hook into RideConfirmedScreen
- 5+ km/h for 10s -> auto-transition to active

**1.6 Biometric lock on app resume (2h)**
- AppState listener
- If background > 5min, require biometric on resume
- Settings toggle to enable/disable

**Deliverable:** App is fully functional with zero TODOs.

---

### PHASE 2 — Visual Premium (Week 2, ~16h)

Make the app *look* premium.

**2.1 Static Map previews (5h)**
- New service: `staticMapService.ts`
- Helper: `getRoutePreviewUrl(origin, dest, polyline)` returns image URL
- Use in:
  - Chat ride context card (top of ChatScreen)
  - RideHistoryScreen entries
  - Shared ride links
  - Post board cards
- Cache aggressively (these never change)

**2.2 Street View pickup previews (4h)**
- New service: `streetViewService.ts`
- `getPickupPhotoUrl(lat, lng)` returns Street View thumbnail
- Show in PickupModal: each pickup point gets a real photo
- Fallback to gradient placeholder if Street View unavailable

**2.3 Forward geocoding (2h)**
- Extend `geocodingService.ts` to accept typed address -> coords
- Use in destination search: user types "Aftab Nagar" -> snap to coords
- Fixes the "address typed in chat" case

**2.4 Custom map style (3h)**
- Generate dark AIUB brand style via Google Cloud Console
- Apply via `customMapStyle` prop on MapView
- Toggle in Settings: Auto / Light / Dark / AIUB Brand

**2.5 Place Details enrichment (2h)**
- When user selects destination, fetch Place Details
- Show photos, opening hours (for shopping malls), rating
- Cache in Firestore `place_cache/{placeId}` to avoid re-fetching

**Deliverable:** App looks like a paid product, not a hobby project.

---

### PHASE 3 — Smart Movement (Week 3, ~14h)

Make the app *feel* premium.

**3.1 Roads API snap-to-road (5h)**
- New service: `roadsService.ts`
- `snapToRoads(points[])` returns road-aligned coords
- Apply to:
  - Own rider marker (smooth movement)
  - Other rider markers in LiveMapScreen
  - Active ride polyline tracking
- Batch up to 100 points per call to save quota

**3.2 Traffic-aware route polyline (4h)**
- Use Routes API `TRAFFIC_ON_POLYLINE` extra
- Render polyline with multi-color segments (green/yellow/red)
- Show in RideActiveScreen as "live traffic"
- Update every 30s

**3.3 ETA-aware partner ranking (3h)**
- Current matching uses straight-line distance (Haversine)
- Upgrade: Distance Matrix batch call for all visible riders
- Rank by actual travel time, not crow-fly distance
- Cache 60s to avoid quota burn

**3.4 Smart pickup suggestions (2h)**
- Based on time-of-day + history (already have `searchHistoryService`)
- Add: "Riders usually go from Main Gate at this time"
- Surface in HomeScreen header

**Deliverable:** Tracking and routing feel as polished as Uber.

---

### PHASE 4 — Multi-Rider & Optimization (Week 4, ~12h)

Unlock new revenue / engagement.

**4.1 Group ride creation (4h)**
- Post board allows `maxRiders: 3` or `4`
- New chat mode: `group_ride`
- 3-way deal confirmation

**4.2 Route Optimization API integration (5h)**
- New service: `routeOptimizationService.ts`
- For 3+ riders, compute optimal pickup order
- Show optimized sequence in chat: "Pickup order: Mozahid -> Sakib -> Tania"
- Split fare proportionally by leg distance

**4.3 Live ride sharing link (3h)**
- Generate token: `rides/{rideId}/share/{token}`
- Cloud Function endpoint: `/ride/share/:token`
- Returns minimal HTML with embedded map (Maps Embed API)
- WhatsApp/SMS shareable: "Track my ride live"
- Auto-expires when ride completes

**Deliverable:** Group rides unlock, family/friends can track.

---

### PHASE 5 — Premium Tier (Week 5-6, ~20h)

Monetization + retention.

**5.1 Premium subscription model (4h)**
- Firestore `users/{uid}.premium = { tier, expiresAt, source }`
- Sources: paid, badge_earned (Elite Rider auto-gets premium), referral
- Free users: limited features
- Hook into Stripe/bKash for Bangladesh payments

**5.2 3D cinematic ride preview (8h)**
- Aerial View API for top-down cinematic of destination
- Maps 3D SDK for in-app 3D flyover before ride starts
- Premium only — generates excitement, shareable

**5.3 Voice-to-text chat (3h)**
- expo-av for recording
- Send to Google Cloud Speech-to-Text
- Auto-transcribe + send as text message
- Hands-free chatting during rides

**5.4 Priority matching for premium (2h)**
- Premium riders surface first in nearby list
- 50m extended search radius
- "Verified Premium" badge on chat / map

**5.5 Web admin dashboard scaffold (3h)**
- Next.js / Vite + Maps JavaScript API
- See live rider heatmap
- Manage reports, suspensions
- Revenue analytics

**Deliverable:** Two-tier app with real monetization path.

---

### PHASE 6 — Polish & Scale (ongoing)

**6.1 Custom dataset upload (Maps Datasets API)**
Upload AIUB campus polygon — use for geofence boundary, "you are on campus" detection.

**6.2 Natural language search (Maps Grounding Lite)**
"Find me a place to eat near Kuril" -> AI-powered place suggestions.

**6.3 User-uploaded pickup photos (Street View Publish)**
Crowd-sourced Street View patches for hidden pickup spots not on Google's map.

**6.4 Offline maps**
Cache key tiles locally for low-data fallback.

**6.5 PWA / Web companion**
Maps JavaScript + Embed API for `gosharex.app/track/...` web view.

---

## 5. Technical Patterns & Best Practices

### Caching Strategy

Every Google API call should be cached because they cost money. Tiered approach:

| Cache Layer | TTL | What |
|---|---|---|
| In-memory (React Query) | session | Autocomplete, Place Details |
| AsyncStorage | 24h | Static maps, Street View URLs |
| Firestore `place_cache/` | 30 days | Place Details (shared across users) |
| Cloud Function memory | 5 min | Routes API responses for popular routes |

### API Quota Budget per User per Day

Rough enterprise budget at 1000 daily active users:

| API | Calls/User/Day | Total/Day | Monthly Cost |
|---|---|---|---|
| Places Autocomplete | 5 | 5,000 | $42 |
| Distance Matrix | 20 | 20,000 | $100 |
| Directions/Routes | 10 | 10,000 | $50 |
| Roads (snap-to-road) | 100 batched | 100,000 | $30 |
| Static Maps | 8 (cached) | 8,000 | $16 |
| Street View Static | 3 (cached) | 3,000 | $21 |
| Geocoding | 2 | 2,000 | $10 |
| **Total** | | | **~$270/mo** |

For a free student-targeted app, this is high. Strategies:
- Cache aggressively (Firestore + AsyncStorage)
- Server-side proxy via Cloud Functions to inject API keys (hides from clients)
- Per-user daily quota in `rate_limits/{uid}`
- Premium users get higher quotas

### Service Layer Pattern

All new APIs follow this template:

```typescript
// src/services/google/<api>Service.ts
import ENV from '@/config/env';
import { fetchJson, GOOGLE_API_ENDPOINTS } from './base';
import { logger } from '@/utils/logger';

class FooService {
  private cache = new Map<string, { value: T; expires: number }>();

  async getX(params): Promise<T> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    try {
      const data = await fetchJson(...);
      this.cache.set(cacheKey, { value: data, expires: Date.now() + TTL });
      return data;
    } catch (err) {
      logger.error('FooService.getX', err);
      throw err;
    }
  }
}

export default new FooService();
```

### Security

- **Never** expose API keys in client bundle directly — even with restrictions, bundle is downloadable
- Move all expensive APIs (Routes, Route Optimization, Static Maps) behind Cloud Functions
- Client calls `https://us-central1-gosharex.cloudfunctions.net/staticMap?...` which adds key server-side
- Restrict each API key by:
  - Android: package name + SHA-1
  - iOS: bundle ID
  - HTTP referrer (for web)
  - IP allow-list (for Cloud Functions)

---

## 6. Cost & Quota Strategy

### Free Tier Optimization

Google gives $200/month free credit. To stay within:
1. Aggressive client-side caching (target 70%+ hit rate)
2. Firestore-backed shared cache for Place Details
3. Lazy load — don't fetch until user actually needs it
4. Batch where possible (Distance Matrix: 1 call for 10 riders, not 10 calls)

### Quota Alerts (Cloud Console setup)

Set budget alerts:
- 50% of $200 -> warning email
- 80% -> Slack alert
- 100% -> auto-disable non-essential APIs

### Per-User Rate Limits

Cloud Function middleware:
```typescript
// rate-limit by Firestore counter
const today = new Date().toISOString().slice(0, 10);
const ref = admin.firestore().doc(`rate_limits/${uid}_${today}`);
const snap = await ref.get();
const count = snap.data()?.count ?? 0;

if (count > QUOTA[user.tier]) throw new HttpsError('resource-exhausted');
await ref.set({ count: count + 1 }, { merge: true });
```

---

## 7. Success Metrics

### Phase 1 (Foundation)
- Zero TODO comments in codebase
- Analytics events flowing to Firebase Console
- 100% of new ride flows trigger geofence/movement events

### Phase 2 (Visual)
- All chat ride contexts show static map (measured by image render count)
- 80%+ of pickup points have Street View previews
- Bounce rate on PickupModal drops 30%

### Phase 3 (Smart)
- Marker jitter complaints drop to 0 in user feedback
- ETA accuracy within 2 min of actual arrival
- Match-to-ride conversion +20%

### Phase 4 (Multi-rider)
- 10% of rides become group rides
- Avg fare savings per group rider +50%
- Shared link clicks tracked

### Phase 5 (Premium)
- Premium conversion 5% of MAU
- Premium retention 80% month-over-month
- Voice messages 15% of total messages

### Phase 6 (Scale)
- 99.9% uptime
- p95 API response time < 500ms
- Quota stays within $300/mo at 1000 DAU

---

## Quick Start — Pick Your Path

| Goal | Start With |
|---|---|
| Make app feel finished | Phase 1 (Foundation Fixes) |
| Make app look premium | Phase 2 (Visual Premium) |
| Make app feel premium | Phase 3 (Smart Movement) |
| Unlock new revenue | Phase 5 (Premium Tier) |
| Show off to friends/judges | Phase 5.2 (3D Aerial View) |

**Recommended:** Phase 1 -> 2 -> 3 in order. Each phase compounds the previous. Don't jump to Phase 5 before Phase 3 is done.

---

*Built with ambition by Mozahid · AIUB CSE*
