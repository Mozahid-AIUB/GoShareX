# GoShareX — A-Z Audit (Punch-List)

> তারিখ: 2026-06-16 · Branch: `feature/supabase-migration`
> পদ্ধতি: code ধরে ধরে যাচাই (guess না)। Build health: **`tsc --noEmit` exit 0 — পুরো codebase clean compile করে, কোনো type error নেই।** ✅

এই app আমি ভাবার চেয়ে অনেক পরিণত — Firebase→Supabase migration **কার্যত শেষ**, security audit হয়ে গেছে। তাই এই তালিকা "কী ভাঙা" না, বরং **premium production-এ পৌঁছাতে আসল ফাঁক কোথায়**।

---

## ✅ যা শক্ত (কাজ করে / প্রমাণিত)

- **Auth (Supabase):** register / login / logout / email-verify / forgot-password OTP — Expo Go-তে tested।
- **App খোলে** — splash freeze fixed, navigation flow ঠিক।
- **Realtime:** chat (1v1 / group / ride), online-offline presence, in-app notification feed, global incoming-request banner।
- **Geo-matching engine:** server-side PostGIS RPC `nearby_riders` — distance + match (একই গন্তব্য ≤৫০০m), coordinate দিয়ে (text না)। SQL-proven।
- **Ride lifecycle:** create → ready → start → complete → cancel + **atomic accept** (একসাথে অনেকে request করলে race-safe, শুধু প্রথমজন জেতে)।
- **Trust/rating/badge:** server-only RPC (client সংখ্যা পাঠায় না = cheat করা যায় না), badge auto-earn।
- **Security:** PII lockdown (অন্যের phone/email আর leak হয় না), request rate-limit, RLS সব টেবিলে।
- **Play Store mandatory:** Delete-my-account RPC done।
- **Ride history, ratings** — Supabase-এ migrated।

---

## ⚠️ অর্ধেক-তারে-লাগানো / আসল device-এ যাচাই দরকার

### 🔴 #১ — Discovery শুধু "Live Map" খোলা থাকলে (সবচেয়ে বড় functional ফাঁক)
- **প্রমাণ:** নিজের presence (active_riders-এ লেখা) হয় **শুধু `LiveMapScreen`-এ** (`startWatching`, line 318)। Map ছাড়লেই `stopWatching()` row মুছে দেয় (line 361-363)। Home-এর `useNearbyRiders` শুধু **পড়ে**, নিজের presence **লেখে না**।
- **মানে:** তুমি শুধু Live Map screen খোলা রাখলে অন্যদের কাছে দৃশ্যমান। **দুজন মানুষ Home-এ থাকলে কেউ কাউকে দেখবে না** — তারা কেবল তখনই match করবে যখন দুজনেই একই সময়ে Live Map খুলে রাখে।
- **কেন আগে ধরা পড়েনি:** geo-matching test-এ fake rider সরাসরি SQL দিয়ে active_riders-এ ঢোকানো হয়েছিল — তাই "কে আমার presence লেখে" প্রশ্নটা কখনো বাস্তবে test হয়নি।
- **Premium fix:** presence broadcast-কে Map screen থেকে আলাদা করে **global** করা — destination set + app foreground + ইউজার "Go Live" চালু রাখলে যেকোনো screen-এ discoverable। (`startBroadcastingLocation` ফাংশন আছে কিন্তু কোথাও call হয় না — অর্ধেক বানানো।)

### 🟠 #২ — Search / geocoding এখন বন্ধ (Google billing)
- key-এর project-এ active billing নেই → custom destination search কাজ করে না → matching আসল dest coordinate পায় না। **তুমি ঠিক করছ** ("done" বললে re-test)।

### 🟠 #৩ — Push / Google Sign-In — শুধু real build-এ যাচাইযোগ্য
- App-closed push (Edge Function `send-push` via Expo Push) — **code done, কিন্তু Expo Go-তে test হয় না**, কোনো production build-এ এখনো verify করা হয়নি।
- Google Sign-In — code done, কিন্তু Android OAuth client + SHA-1 দরকার, untested।
- Online/offline (chat) — দুই-device-এ যাচাই বাকি।

---

## ❌ Launch-এর জন্য যা এখনো নেই

- **Privacy Policy public page** (GitHub Pages URL) — screen আছে, কিন্তু Play Store-এর জন্য একটা hosted URL লাগবে।
- **একটা verified production build** — সব flow সহ একবার আসল .aab বানিয়ে নিজে চালিয়ে দেখা।
- **Store listing** — screenshot, description, feature graphic, icon (icon হয়ে গেছে)।

---

## 💎 Premium upgrade (bug না — "wow" feel-এর জন্য)

- **Matching:** "একই গন্তব্য ≤৫০০m" → **direction/route-aware** (driver যে path দিয়ে যাচ্ছে, rider সেই পথে পড়ে কিনা)। এটাই আসল differentiator।
- **UI polish:** empty state, loading skeleton, smooth animation, clear CTA।
- Home PartnerCard avatar-এ নামের অক্ষর না দেখিয়ে vehicle icon (rickshaw/bike/cng)।

---

## 🎯 সুপারিশ করা fix-ক্রম (professional sequence)

| ক্রম | কাজ | কেন আগে |
|----|----|----|
| ১ | **Discovery global করা** (#১) | এটা ছাড়া দুজন মানুষ আসলে match-ই করতে পারে না — core loop-এর প্রাণ |
| ২ | **Billing → search চালু** (#২) | তুমি করছ; custom destination + আসল coordinate দরকার |
| ৩ | **Premium matching** (route-aware) | differentiator |
| ৪ | **UI polish** | premium feel |
| ৫ | **Launch:** prod build + Privacy Policy + store listing | বাজারে নামানো |

> পরের ধাপ: #১ (discovery global) দিয়ে শুরু করা সবচেয়ে বুদ্ধিমানের কাজ — এটা ছাড়া বাকি সব polish-এর উপর দাঁড়ায় কিন্তু আসল matching হয় না।
