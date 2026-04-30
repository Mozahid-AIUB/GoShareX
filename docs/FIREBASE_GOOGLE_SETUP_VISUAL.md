# 🔥 Firebase Google Sign-In Setup — Step by Step Visual Guide

**তুমি যা করবে এই চেকলিস্ট অনুযায়ী:**

---

## ✅ Checklist

- [ ] Firebase Console এ যাওয়া
- [ ] Google authentication enable করা
- [ ] Web Client ID collect করা
- [ ] .env populate করা
- [ ] npm install চালানো
- [ ] Development build বানানো
- [ ] Device এ test করা

---

## 📱 STEP 1: Firebase Console এ Google Auth Enable করা

### 1.1️⃣ Firebase Console খোলা

👉 এই URL এ যাও:
```
https://console.firebase.google.com/
```

**স্ক্রিন দেখাবে এরকম:**
```
┌─────────────────────────────────────────┐
│ Firebase Console                        │
│ ┌─────────────────────────────────────┐ │
│ │ Your Projects                       │ │
│ │                                     │ │
│ │ [GoShareX] ← Click এটা               │ │
│ │ [Other projects...]                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 1.2️⃣ Authentication Section খোলা

বাম পাশে মেনুতে দেখবে:
```
├── Build
│   ├── Authentication ← CLICK HERE
│   ├── Realtime Database
│   ├── Firestore Database
│   └── ...
└── ...
```

**Click করো:** `Authentication`

### 1.3️⃣ Sign-in Method Tab দেখা

Authentication পেজ খুলে গেলে, এর মধ্যে `Sign-in method` ট্যাব দেখবে।

```
┌──────────────────────────────────────────┐
│ Build > Authentication                   │
├──────────────────────────────────────────┤
│  [Sign-in method]  [Quotas]  [Settings] │  ← Click "Sign-in method"
├──────────────────────────────────────────┤
│ Sign-in providers                        │
│                                          │
│ [ Email/Password ]  ✓ Enabled            │
│ [ Google ]          ✗ Disabled  ← এখানে   │
│ [ Facebook ]        ✗ Disabled           │
│ ...                                      │
└──────────────────────────────────────────┘
```

### 1.4️⃣ Google Authentication Enable করা

**Google** পাশে click করো।

একটা ডায়ালগ আসবে:
```
┌─────────────────────────────────────────┐
│ Enable Google Sign-In?                  │
├─────────────────────────────────────────┤
│                                         │
│ ☑️ Enable                                │
│                                         │
│ Project support email:                  │
│ [your-email@example.com] ← এটা ঠিক আছে │
│                                         │
│             [SAVE]  [CANCEL]            │
└─────────────────────────────────────────┘
```

**Click করো:** `SAVE`

### 1.5️⃣ Success! ✓

Google authentication এখন **Enabled** হবে:

```
[ Google ]          ✓ Enabled  ← এটা দেখাবে
```

---

## 🔑 STEP 2: Web Client ID Collect করা

### 2.1️⃣ Web SDK Configuration খোলা

Authentication পেজে, একই মেনুতে দেখবে:

```
├── Build > Authentication
│   ├── Users
│   ├── Sign-in method
│   ├── Web SDK configuration ← CLICK HERE
│   └── ...
```

**Click করো:** `Web SDK configuration`

### 2.2️⃣ Web Client ID খুঁজে নেওয়া

একটা প্যানেল আসবে:

```
┌──────────────────────────────────────────┐
│ Web SDK Configuration                    │
├──────────────────────────────────────────┤
│                                          │
│ API Key:                                 │
│ AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxx     │
│                                          │
│ Firebase App ID:                         │
│ 1:234567890:web:abcdefghijklmnop       │
│                                          │
│ Web Client ID:                           │
│ 234567890-xxxxx.apps.googleusercontent │
│ .com                                     │
│ ← এটা copy করো!                          │
│                                          │
└──────────────────────────────────────────┘
```

**Web Client ID** এর সম্পূর্ণটা copy করো:
```
234567890-xxxxx.apps.googleusercontent.com
```

---

## 🔐 STEP 3: .env File Populate করা

### 3.1️⃣ .env File Open করা

এই file টা খোলো:
```
d:\Way_To_Job\GoShareX\.env
```

### 3.2️⃣ Google Web Client ID Add করা

`.env` ফাইলে এই line টা খুঁজবে:
```env
GOOGLE_WEB_CLIENT_ID=
```

এটাকে এরকম করে দাও (Web Client ID paste করে):
```env
GOOGLE_WEB_CLIENT_ID=234567890-xxxxx.apps.googleusercontent.com
```

### 3.3️⃣ সম্পূর্ণ .env File (উদাহরণ):

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxx
FIREBASE_AUTH_DOMAIN=gosharex-xxxxx.firebaseapp.com
FIREBASE_DATABASE_URL=https://gosharex-xxxxx.firebaseio.com
FIREBASE_PROJECT_ID=gosharex-xxxxx
FIREBASE_STORAGE_BUCKET=gosharex-xxxxx.appspot.com
FIREBASE_MESSAGING_SENDER_ID=1234567890
FIREBASE_APP_ID=1:1234567890:web:abcdefghijklmnop
FIREBASE_MEASUREMENT_ID=G-ABCDEFGHIJ

# Google Authentication
GOOGLE_WEB_CLIENT_ID=234567890-xxxxx.apps.googleusercontent.com

# Google Maps Platform
GOOGLE_MAPS_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxx

# App Configuration
APP_ENV=development
```

**Save করো!** (Ctrl+S)

---

## 📦 STEP 4: npm install চালানো

### 4.1️⃣ Terminal খোলা

VS Code এ Terminal খোলো:
```
Ctrl+` (backtick)
```

### 4.2️⃣ npm install চালানো

টার্মিনালে এই কমান্ড টাইপ করো:

```bash
npm install
```

**Output দেখাবে:**
```
added X packages, removed Y packages, audited Z packages in Xms
```

✓ সম্পন্ন হলে `added X packages` দেখাবে।

### 4.3️⃣ Alternative: Auto Setup Script ব্যবহার করা

বা এই auto-setup script চালাও:

```bash
bash scripts/setup-google-signin.sh
```

এটা automatically:
- ✓ .env বানায় (যদি না থাকে)
- ✓ npm install চালায়
- ✓ TypeScript check করে
- ✓ Configuration verify করে

---

## 🏗️ STEP 5: Development Build বানানো

### 5.1️⃣ Prerequisite: EAS Project Setup করা

প্রথমবার build করলে EAS configure করতে হবে:

```bash
npx eas build --platform android
```

এটা প্রথমে জিজ্ঞাসা করবে:
```
? Would you like to use the Expo CLI locally? (Y/n)
→ Y

? Would you like to log in to your Expo account? (Y/n)
→ Y

? Create a new EAS project? (Y/n)
→ Y
```

### 5.2️⃣ Build শুরু করা

```bash
npm run build:android
```

Or যদি iOS এর জন্য চাও:
```bash
npm run build:ios
```

### 5.3️⃣ Build Process

```
Building...
████████████████████░ 50%
████████████████████████████░ 70%
████████████████████████████████████░ 90%
✓ Build complete!

Download your APK:
→ https://expo.dev/...
```

**Download করো** APK ফাইল টা।

---

## 📱 STEP 6: Test করা

### 6.1️⃣ APK Install করা

Device এ APK install করো:

```bash
# Automatically install on connected device:
adb install path/to/app.apk

# Or manually:
# 1. Download APK from EAS link
# 2. Transfer to device
# 3. Tap to install
```

### 6.2️⃣ App Open করা

```
Device এ আপনার GoShareX app খোলো
```

### 6.3️⃣ Gmail দিয়ে Login Test করা

**ধাপ 1:** "Continue with Gmail" button টা tap করো

```
┌─────────────────────────────────┐
│      GoShareX Login             │
├─────────────────────────────────┤
│                                 │
│   [Sign In] (Purple button)     │
│                                 │
│           OR                    │
│                                 │
│ [Google] Continue with Gmail ←  │
│                                 │
└─────────────────────────────────┘
```

**ধাপ 2:** Google account select করো

```
Google Login Dialog আসবে:
[accounts.google.com login screen]
Select your account or add new account
```

**ধাপ 3:** Gmail account দিয়ে sign in করো

```
yourname@gmail.com
[Password]
```

**ধাপ 4:** Success! 🎉

যদি সব ঠিক হয়, তুমি এই স্ক্রিন দেখবে:
```
✓ Successfully signed in!
  Your email: yourname@gmail.com
  
[Home Screen loads...]
```

### ⚠️ সম্ভাব্য Error Messages এবং Fix:

#### Error 1: "Gmail Required"
```
Alert: "Only Gmail addresses allowed"
```
**Fix:** তোমাকে @gmail.com account দিয়ে sign in করতে হবে। Yahoo/Outlook এ কাজ করবে না।

#### Error 2: "Sign-in was cancelled"
```
User dismissed Google login dialog
```
**Fix:** আবার try করো। এটা সাধারণ, user cancelled মানে আর কিছু নয়।

#### Error 3: "Google Sign-In library not available"
```
Error: Google Sign-In library not available...
```
**Fix:** 
- Expo Go ছাড়িয়ে পরিত্যাগ করো
- Development build দিয়ে test করো (APK যা তুমি build করেছো)
- Expo Go তে Google Sign-In কাজ করে না!

#### Error 4: "Invalid Web Client ID"
```
Error: Invalid web client id
```
**Fix:**
- .env এ GOOGLE_WEB_CLIENT_ID verify করো
- Firebase Console থেকে নতুন Web Client ID copy করো
- Rebuild করো: `npm run build:android`

---

## 📊 Test Checklist

যখন Testing করবে:

- [ ] Gmail দিয়ে login সফল হয়েছে
- [ ] Firestore এ user document তৈরি হয়েছে (Firebase Console দেখো)
- [ ] Home screen load হয়েছে
- [ ] FCM token registered হয়েছে (debug logs দেখো)
- [ ] Logout করতে পারছো
- [ ] আবার login করতে পারছো (এক্সিস্টিং user)
- [ ] Non-Gmail account দিয়ে Error message আসছে

---

## 📚 Complete Flow Diagram

```
Step 1: Firebase Console
├── Authentication enable
└── Get Web Client ID ✓

Step 2: .env Configuration
├── Add GOOGLE_WEB_CLIENT_ID
└── npm install ✓

Step 3: Build
├── npm run build:android
└── Download APK ✓

Step 4: Deploy
├── Install on device
└── Run app ✓

Step 5: Test
├── Tap "Continue with Gmail"
├── Sign in with Gmail
├── Success! ✓
└── Check Firestore user doc ✓
```

---

## ❓ FAQs

**Q: Expo Go তে কাজ করবে?**
A: না। Google Sign-In জন্য development build লাগবে।

**Q: আমার Web Client ID কোথায় রাখবো?**
A: .env এ: `GOOGLE_WEB_CLIENT_ID=xxx`

**Q: Build কত সময় লাগে?**
A: সাধারণত 5-10 মিনিট।

**Q: Multiple Google accounts দিয়ে test করতে পারি?**
A: হ্যাঁ! প্রতিটি Gmail account একটা আলাদা user document তৈরি করবে।

**Q: Logout কীভাবে?**
A: Profile screen থেকে "Logout" button দেখবে। এটা Google এবং Firebase উভয় থেকে signout করবে।

---

**প্রস্তুত? শুরু করো Firebase Console দিয়ে! 🚀**
