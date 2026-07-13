# GoShareX — কাজের অগ্রগতি (Progress List)

> এই file-টা তুমি যেকোনো সময় খুলে চেক করতে পারবে। সর্বশেষ আপডেট: 2026-06-16
> Branch: `feature/supabase-migration`

---

## ✅ যা শেষ হয়েছে (verified — কাজ করছে)

### ১. Splash freeze fix — app খুলছে এখন
- **সমস্যা:** production/preview build-এ app splash screen-এ আটকে যেত, কখনো login screen-এ আসত না (কালো স্ক্রিন)।
- **আসল কারণ ২টা:**
  1. `babel.config.js`-এ duplicate reanimated plugin → worklets init নষ্ট → JS thread freeze। (commit `2235965`)
  2. `App.tsx`-এ splash hide করা হত `onLayout`-এর ভেতরে, কিন্তু সেই সময় `ready` তখনো false → splash কখনো hide হত না → Android "splash timeout" → কালো স্ক্রিন। (commit `8673b78`)
- **Fix:** splash এখন `useEffect`-এ `ready` true হলেই hide হয় (Expo-র official নিয়ম)।
- **অবস্থা:** ✅ তুমি নিজে confirm করেছ — "apps install hyce open ou hyce"।

### ২. Location bug — Roads API 404 spam বন্ধ
- **সমস্যা:** প্রতি ৫ সেকেন্ডে Roads API 404 error, log ভরে যেত, battery/quota নষ্ট।
- **Fix:** circuit breaker — একবার fail করলে ঐ session-এ snap-to-roads বন্ধ, raw GPS দিয়ে map তবু ঠিক চলে। শুধু একবার warning দেয়, তারপর চুপ। (commit `c7fc1ee`)
- **File:** `src/services/google/roadsService.ts`
- **অবস্থা:** ✅ logcat দিয়ে verify — একটাই warning, তারপর আর spam নেই।

### ৩. Destination search — keyboard-এর নিচে ইনপুট লুকিয়ে যাওয়া
- **সমস্যা:** destination search box keyboard-এর পেছনে চলে যেত, লেখা দেখা যেত না।
- **Fix:** Modal-এ `KeyboardAvoidingView` (behavior="padding") যোগ করা হয়েছে। (commit `eb87d23`)
- **File:** `src/screens/home/HomeScreen.tsx`
- **অবস্থা:** ✅ screenshot দিয়ে verify — search box এখন keyboard-এর উপরে।

### ৪. Google Maps খরচের প্রশ্নের উত্তর
- Routes/Maps API ছোট app-এ free tier-এর ভেতরে = **$0**। Roads API skip করলে আরও সাশ্রয়।
- পুরোনো $200/month credit মার্চ ২০২৫-এ বন্ধ; এখন প্রতি-API free tier (Places/Geocoding মাসে হাজারে হাজারে free)।

---

## ⚠️ এখন আটকে আছে যেখানে (তোমার action দরকার)

### Google Cloud Billing — "Search unavailable" এর আসল কারণ
- **প্রমাণ:** তোমার `.env`-এর Maps key (`...1TbtpA` দিয়ে শেষ) দিয়ে test করলে Google নিজে বলে:
  `status: REQUEST_DENIED — "You must enable Billing on the Google Cloud Project"`
- মানে: এই key যে project-এর, সেই project-এ active billing লাগানো নেই (হয়তো অন্য project-এ আছে, বা suspended)।
- **এটা code-এর bug না** — Google account-এর সেটিং। শুধু তুমি ঠিক করতে পারবে।

**তোমার করণীয় (৩ মিনিট, কোডিং লাগবে না):**
1. https://console.cloud.google.com/google/maps-apis/credentials → key `...1TbtpA` কোন project-এ দেখো।
2. সেই project-এ → **Billing → Link a billing account** → active billing যুক্ত করো।
3. **Billing → Budgets & alerts** → $5 budget + email alert বসাও (surprise bill ঠেকাতে)।
4. শেষ হলে আমাকে **"done"** বলো → আমি আবার test করে confirm করব search কাজ করছে কিনা।

> বিকল্প: চাইলে Google বাদ দিয়ে free provider (OpenStreetMap/LocationIQ) বসাতে পারি — card লাগবে না, কিন্তু code পাল্টাতে হবে ও Dhaka-তে quality সামান্য কম হতে পারে।

---

## ⏳ পরে করব (pending — তোমার সিদ্ধান্তের অপেক্ষায়)

- [ ] **Premium matching algorithm** — text-match না, geo-proximity (কাছাকাছি route মেলানো)। বড় কাজ।
- [ ] **Premium UI polish** — professional/premium চেহারা।
- [ ] **Production build → Play Store** — সব fix verify হওয়ার পর।
- [ ] **Privacy Policy page** — GitHub Pages (mozahidislam.github.io/GoShareX/)।
- [ ] **API key restriction** — security: key গুলো নির্দিষ্ট app/API-তে সীমাবদ্ধ করা।

---

## 🔒 নিরাপত্তা নিয়ম (সবসময় মানা হচ্ছে)
- কোনো key/password চ্যাটে চাওয়া বা দেখানো হয় না — শুধু `.env`-এ।
- তোমার অনুমতি ছাড়া কোনো file delete করা হয় না।
- কোনো hardcoded secret পেলে আগে থামিয়ে জানানো হয়।

---

## 📌 পরের ধাপ
তুমি Google Console-এ billing ঠিক করে **"done"** বলবে → আমি test করব → কাজ করলে এরপর premium UI + matching algorithm + production build।
