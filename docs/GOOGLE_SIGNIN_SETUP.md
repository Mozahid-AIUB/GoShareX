# 🔐 Google Sign-In Setup Guide for GoShareX

## Overview
This guide explains how to set up Google Sign-In with Gmail validation for the GoShareX app.

---

## 🎯 Features Implemented

✅ **Gmail Validation** — Only @gmail.com addresses allowed
✅ **Google Sign-In Button** — Beautiful UI with Google branding
✅ **Firebase Integration** — Automatic user document creation
✅ **FCM Registration** — Push notifications enabled on sign-in
✅ **Suspension Check** — Validates user status after login

---

## 📋 Setup Steps

### Phase 1: Firebase Console Configuration

#### Step 1.1: Enable Google Authentication in Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **GoShareX** project
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Google** and enable it
5. Set **Support email** to your project contact email
6. Click **Save**

#### Step 1.2: Create Web OAuth 2.0 Credentials
1. Go to **Authentication** → **Web SDK configuration**
2. Copy the **Web Client ID** (format: `xxxxx.apps.googleusercontent.com`)
3. Save this ID for later

---

### Phase 2: Project Configuration

#### Step 2.1: Install Dependencies
```bash
npm install
# The package.json already includes @react-native-google-signin/google-signin
```

#### Step 2.2: Configure Environment Variables

1. **Copy the example file:**
```bash
cp .env.example .env
```

2. **Add Google Web Client ID to `.env`:**
```env
GOOGLE_WEB_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
```

**Where to get `GOOGLE_WEB_CLIENT_ID`:**
- Firebase Console → Authentication → Web SDK configuration → Web Client ID

---

### Phase 3: Android Configuration

#### Step 3.1: Update `google-services.json`
Ensure your `android/app/google-services.json` is up to date:

```bash
# Download from Firebase Console:
# Project Settings → General → Download google-services.json
```

Place it at: `android/app/google-services.json`

#### Step 3.2: Configure `app.config.js`
Make sure your `app.config.js` includes the necessary plugins:

```javascript
// app.config.js
export default {
  expo: {
    // ... other config
    plugins: [
      '@react-native-google-signin/google-signin',
      'expo-build-properties',
      // ... other plugins
    ],
  },
};
```

---

### Phase 4: iOS Configuration (If needed)

#### Step 4.1: Get OAuth Client ID for iOS
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Use it to configure iOS build

#### Step 4.2: Update `app.config.js`
```javascript
// app.config.js
export default {
  expo: {
    // ... config
    ios: {
      infoPlist: {
        GIDClientID: 'your-ios-client-id.apps.googleusercontent.com',
      },
    },
  },
};
```

---

## 🚀 Building and Testing

### Development Build (Required for FCM + Google Sign-In)
```bash
# Create development build for Android
npm run build:android

# OR for iOS
npm run build:ios
```

⚠️ **Important:** Google Sign-In won't work in Expo Go. You must use a development build!

### Testing Locally
```bash
# Start Expo
npm start

# Run on Android device/emulator
npm run android
```

---

## 🔍 How It Works

### Login Flow
```
User clicks "Continue with Gmail"
        ↓
GoogleSignin.signIn() triggered
        ↓
Google OAuth dialog appears
        ↓
User signs in with Gmail account
        ↓
Valid Gmail? (@gmail.com)
  ├─ NO  → Alert: "Only Gmail addresses allowed"
  └─ YES → Continue
        ↓
Firebase credentials obtained
        ↓
Firebase authentication
        ↓
User document created/updated in Firestore
        ↓
Suspension check
        ↓
FCM token registered
        ↓
User logged in ✓
```

---

## 📝 Code Structure

### File: `src/services/firebase/googleAuthService.ts`
- **`initialize()`** — Set up Google Sign-In library
- **`signInWithGoogle()`** — Perform sign-in and validation
- **`signOut()`** — Sign out user
- **`isAvailable()`** — Check if Google Sign-In is available

### File: `src/screens/auth/LoginScreen.tsx`
- Google button UI with beautiful styling
- Error handling for non-Gmail addresses
- Integration with existing email/password login

### Utilities: `src/utils/validators.ts`
- **`isValidGmail(email)`** — Validates @gmail.com domain
- **`isValidEmail(email)`** — General email validation

---

## 🛡️ Email Validation

### Gmail-Only Rule
The app enforces **strict Gmail validation**:

```typescript
// Only these are allowed:
✓ user@gmail.com
✓ firstname.lastname@gmail.com
✓ user123@gmail.com

// These will be rejected:
✗ user@yahoo.com
✗ user@outlook.com
✗ user@aiub.edu.bd
✗ user@googlemail.com (alternative Gmail domain)
```

**Why?** The AIUB rideshare system is designed for AIUB students who typically use Gmail for convenience.

---

## 🐛 Troubleshooting

### "Google Sign-In library not available"
- **Cause:** You're using Expo Go
- **Fix:** Build with development build instead
```bash
npm run build:android
```

### "Only Gmail addresses allowed" error
- **Cause:** User tried signing in with non-Gmail account
- **Fix:** User must use Gmail address (e.g., user@gmail.com)

### "Sign-in was cancelled"
- **Cause:** User dismissed Google login dialog
- **Fix:** No action needed, user can try again

### Token issues or sign-in fails
- **Cause:** Invalid `GOOGLE_WEB_CLIENT_ID` in `.env`
- **Fix:** 
  1. Verify Web Client ID in Firebase Console
  2. Update `.env` with correct ID
  3. Rebuild the app

### "User with this email already exists"
- **Cause:** Email registered with password login already
- **Fix:** Users should use password login or sign out first

---

## 📱 User Experience

### First-Time Google Sign-In
1. User clicks "Continue with Gmail"
2. Google login dialog appears
3. User selects/enters Gmail account
4. User grants permissions
5. Account created automatically
6. User sees Home screen

### Returning Google Sign-In
1. User clicks "Continue with Gmail"
2. Google login dialog appears
3. User's Gmail is pre-filled or shown
4. One-tap login (if available)
5. User logged in immediately

---

## 🔐 Security Notes

✅ **Valid Gmail Only** — Prevents invalid account types
✅ **Firebase Auth** — Secure OAuth 2.0 flow
✅ **HTTPS Only** — All communication encrypted
✅ **User Document** — Auto-created in secure Firestore
✅ **Suspension Check** — Prevents suspended users from accessing

---

## 🔄 Comparison: Email+Password vs Google Sign-In

| Feature | Email+Password | Google Sign-In |
|---------|----------------|-----------------|
| Setup difficulty | Easy | Requires Firebase + Google OAuth |
| User experience | Manual entry | One-tap login |
| Password management | User responsibility | Google handles |
| Email validation | Any valid email | @gmail.com only |
| FCM support | Yes | Yes |
| Account linking | No | Can link email login |

---

## 📚 References

- [Google Sign-In for React Native](https://github.com/react-native-google-signin/google-signin)
- [Firebase Google Auth Docs](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Console](https://console.firebase.google.com/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## ✅ Checklist Before Going Live

- [ ] Firebase Console: Google authentication enabled
- [ ] Web Client ID obtained from Firebase
- [ ] `.env` file configured with `GOOGLE_WEB_CLIENT_ID`
- [ ] `google-services.json` in `android/app/`
- [ ] Dependencies installed (`npm install`)
- [ ] Development build created (`npm run build:android`)
- [ ] Tested on real device (not Expo Go)
- [ ] Gmail validation working
- [ ] User document created in Firestore
- [ ] FCM token registered
- [ ] Suspension check working
- [ ] Error messages user-friendly
- [ ] Production Firebase project ready

---

**Questions or issues?** Check the troubleshooting section or review the code in:
- `src/services/firebase/googleAuthService.ts`
- `src/screens/auth/LoginScreen.tsx`

Happy sharing! 🛺✨
