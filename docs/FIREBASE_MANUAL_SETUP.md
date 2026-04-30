# 🎯 Google Sign-In Setup — Manual Action Checklist

## ✅ Status Check

```
✓ npm dependencies installed
✓ Source files created and configured  
✓ .env file exists with Firebase config
⚠ GOOGLE_WEB_CLIENT_ID — NEEDS YOUR ACTION
```

---

## 📋 What You Need to Do (4 Steps)

### **STEP 1️⃣: Open Firebase Console**

📌 **Action:** Open this URL in browser:
```
https://console.firebase.google.com/
```

✅ **Expected:** Firebase Console loads with list of projects

---

### **STEP 2️⃣: Select GoShareX Project**

**Look for:**
```
Your Projects:
├── GoShareX       ← Click this one
├── Other projects...
└── ...
```

✅ **Expected:** Project dashboard opens

---

### **STEP 3️⃣: Enable Google Authentication**

#### 3a. Go to Authentication

**Left menu:**
```
BUILD
├── Authentication         ← Click here
├── Realtime Database
├── Firestore Database
└── ...
```

✅ **Expected:** Authentication page loads

#### 3b. Click "Sign-in method" Tab

**Top tabs:**
```
[Sign-in method] ← Click
[Quotas]
[Settings]
```

✅ **Expected:** List of sign-in providers shows

#### 3c. Find "Google" and Enable It

**Sign-in providers list:**
```
├── Email/Password      ✓ Enabled
├── Google              ✗ Disabled  ← Click this row
├── Facebook            ✗ Disabled
└── ...
```

#### 3d. Enable Toggle and Save

**Dialog appears:**
```
┌─────────────────────────────┐
│ Enable Google Sign-In?      │
├─────────────────────────────┤
│                             │
│ ☑ Enable                    │
│                             │
│ Project support email:      │
│ [your-email@gmail.com]      │
│                             │
│  [Cancel] [Save]  ← Click   │
└─────────────────────────────┘
```

✅ **Expected:** Google shows "✓ Enabled"

---

### **STEP 4️⃣: Get Web Client ID**

#### 4a. Click "Web SDK configuration"

**Still in Authentication section, look for:**
```
Users
Sign-in method  
Web SDK configuration  ← Click here
```

#### 4b. Find and Copy Web Client ID

**Panel shows:**
```
┌─────────────────────────────────────────┐
│ Web SDK Configuration                   │
├─────────────────────────────────────────┤
│                                         │
│ API Key:                                │
│ AIzaSyDxxxxxxxxxxxxxxxxxxxxxx... (Copy) │
│                                         │
│ Firebase App ID:                        │
│ 1:234567890:web:abcdefghijklmnop       │
│                                         │
│ Web Client ID:                          │
│ 234567890-abcde.apps.               │
│ googleusercontent.com         ← COPY THIS │
│                                         │
└─────────────────────────────────────────┘
```

✅ Copy the complete Web Client ID:
```
234567890-abcde.apps.googleusercontent.com
```

---

## 🔐 Update .env with Web Client ID

### Step 1: Open .env file

```
d:\Way_To_Job\GoShareX\.env
```

### Step 2: Find this line:

```env
GOOGLE_WEB_CLIENT_ID=
```

### Step 3: Add your Web Client ID:

```env
GOOGLE_WEB_CLIENT_ID=234567890-abcde.apps.googleusercontent.com
```

**Before:**
```env
FIREBASE_MEASUREMENT_ID=G-4C79S2EWJF
GOOGLE_MAPS_API_KEY=AIzaSy...
```

**After:**
```env
FIREBASE_MEASUREMENT_ID=G-4C79S2EWJF
GOOGLE_WEB_CLIENT_ID=234567890-abcde.apps.googleusercontent.com
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### Step 4: Save file (Ctrl+S)

✅ **Expected:** File saved with no errors

---

## 🏗️ Build Development APK

### Open Terminal

```
Ctrl + ` (backtick)
```

### Run Build Command

```bash
npm run build:android
```

**Output:**
```
Building...

EAS Build
┌───────────────────────────────────┐
│ Platform: Android                 │
│ Profile: preview                  │
│ Building...                       │
│ ████████████████████░ 50%         │
│ ████████████████████████░ 70%     │
│ ████████████████████████████░ 90% │
│ ✓ Build complete!                │
│                                   │
│ Download: https://expo.dev/...   │
└───────────────────────────────────┘
```

### Download APK

Click the download link and save the APK file.

✅ **Expected:** APK file downloaded (size ~80-150MB)

---

## 📱 Install and Test on Device

### Option A: Using ADB (Android Debug Bridge)

```bash
# Connect your device via USB
# Run:
adb install path/to/app.apk
```

### Option B: Manual Installation

1. Transfer APK to your phone
2. Open File Manager
3. Tap APK file
4. Tap "Install"
5. Tap "Open"

✅ **Expected:** App installs and opens

---

## ✅ Test Gmail Login

### Step 1: Tap "Continue with Gmail"

```
┌─────────────────────────┐
│  GoShareX Login         │
├─────────────────────────┤
│                         │
│  [Email/Password ▼]    │
│                         │
│         OR              │
│                         │
│ [Google] Gmail  ← TAP   │
│                         │
└─────────────────────────┘
```

### Step 2: Select Gmail Account

**Google login screen appears:**
```
[Google Account Selection]
Your Accounts:
├── yourname@gmail.com    ← Select
├── other@gmail.com
└── Add account
```

### Step 3: Sign In

**Password/permission screen:**
```
yourname@gmail.com
[Password field]
[Sign in]
```

### Step 4: Grant Permissions (if asked)

```
GoShareX wants to:
├── View your profile info
├── Access your email address
└── [Allow] [Deny]  ← Choose Allow
```

### Step 5: Success! 🎉

**Verify:**
```
✓ Signed in successfully
✓ Home screen loads
✓ See your profile
```

---

## 🔍 Verify Everything Worked

### In Firebase Console:

1. Go to **Firestore Database**
2. Look for collection: **users**
3. You should see a new document with your Gmail as the key

```json
{
  "uid": "your-uid",
  "email": "yourname@gmail.com",
  "name": "Your Name",
  "rating": 5.0,
  "totalRides": 0,
  "badge": "New Rider",
  "createdAt": "2026-04-28T10:30:00Z"
}
```

✅ **Expected:** User document created in Firestore

---

## ⚠️ Troubleshooting

### Problem: "Only Gmail addresses allowed"

**Cause:** You signed in with a non-Gmail account

**Solution:** Use Gmail account (yourname@gmail.com)

---

### Problem: "Google Sign-In library not available"

**Cause:** Using Expo Go instead of development build

**Solution:** Use the APK you built (development build)

---

### Problem: Invalid Web Client ID

**Cause:** Wrong ID in .env

**Solution:**
1. Re-copy Web Client ID from Firebase
2. Update .env
3. Rebuild APK

---

### Problem: Build fails

**Cause:** Various reasons

**Solution:**
```bash
# Clear cache and retry:
npm run build:android -- --clear-cache
```

---

## 📊 Complete Verification Checklist

After testing, verify all these:

- [ ] Firebase Console shows Google authentication enabled
- [ ] Web Client ID in .env is correct
- [ ] npm install completed successfully
- [ ] Development APK built successfully
- [ ] APK installed on device
- [ ] App opens and shows login screen
- [ ] "Continue with Gmail" button visible
- [ ] Google login dialog appears when tapped
- [ ] Can sign in with Gmail account
- [ ] App shows home screen after login
- [ ] Firestore shows new user document
- [ ] No console errors in app

---

## 🚀 Next (Optional Features)

After basic setup works, you can:

1. **Test Email+Password Login** — Still works alongside Google
2. **Test Logout** — Profile screen → Settings → Logout
3. **Test Multiple Accounts** — Sign in with different Gmail
4. **Test Error Cases** — Try non-Gmail accounts
5. **Check Logs** — View console for debug messages

---

## 📚 Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Google Sign-In Docs](https://developers.google.com/identity)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Full Setup Guide](./GOOGLE_SIGNIN_SETUP.md)

---

## 🎯 Summary

**What you did:**
1. ✓ Installed npm dependencies
2. ✓ Created Google auth service
3. ✓ Added Gmail validation
4. ⏳ Enabled Google auth in Firebase (MANUAL)
5. ⏳ Got Web Client ID (MANUAL)
6. ⏳ Updated .env (MANUAL)
7. ⏳ Built development APK (YOU WILL DO)
8. ⏳ Tested on device (YOU WILL DO)

**Status:** Ready to configure Firebase! 🚀
