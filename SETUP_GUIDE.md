# 🚀 RideShare AIUB - Complete Setup Guide

## Step 1: Install Dependencies

```bash
cd RideShareAIUB
npm install
```

## Step 2: Firebase Setup

### 2.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add Project"
3. Name: "RideShare AIUB"
4. Enable Google Analytics (optional)
5. Create project

### 2.2 Enable Authentication
1. In Firebase Console → Authentication
2. Click "Get Started"
3. Enable "Email/Password"
4. Save

### 2.3 Create Firestore Database
1. In Firebase Console → Firestore Database
2. Click "Create Database"
3. Start in "Production Mode"
4. Choose location (asia-south1 for Bangladesh)
5. Enable

### 2.4 Create Realtime Database
1. In Firebase Console → Realtime Database
2. Click "Create Database"
3. Start in "Locked Mode"
4. Enable

### 2.5 Enable Cloud Messaging
1. In Firebase Console → Cloud Messaging
2. Enable API
3. Done

### 2.6 Get Firebase Config
1. Project Settings → General
2. Scroll to "Your apps"
3. Click "Web" (</>) icon
4. Register app name: "RideShare AIUB Web"
5. Copy the config object

### 2.7 Download google-services.json
1. Project Settings → General
2. Under "Your apps" → Android
3. If not added, click "Add app"
   - Package name: com.aiub.rideshare
   - App nickname: RideShare AIUB
   - Click "Register app"
4. Download `google-services.json`
5. Place in `android/app/` directory

## Step 3: Google Maps Setup

### 3.1 Enable Maps API
1. Go to https://console.cloud.google.com
2. Select your project (or create new)
3. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Distance Matrix API

### 3.2 Create API Key
1. APIs & Services → Credentials
2. Create Credentials → API Key
3. Copy the API key
4. Restrict the key (optional but recommended):
   - Application restrictions → Android apps
   - Add your package name: com.aiub.rideshare
   - API restrictions → Select enabled APIs

## Step 4: Configure Environment

### 4.1 Create .env file
```bash
cp .env.example .env
```

### 4.2 Fill in credentials
Open `.env` and add your Firebase config:

```env
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=rideshare-aiub.firebaseapp.com
FIREBASE_PROJECT_ID=rideshare-aiub
FIREBASE_STORAGE_BUCKET=rideshare-aiub.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:android:abc123
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 4.3 Update app.json
```json
{
  "expo": {
    "extra": {
      "FIREBASE_API_KEY": "AIzaSy...",
      "FIREBASE_AUTH_DOMAIN": "rideshare-aiub.firebaseapp.com",
      // ... add all env vars here
    }
  }
}
```

## Step 5: Setup Firebase Security Rules

### 5.1 Firestore Rules
Go to Firestore → Rules and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null 
        && request.auth.token.email.matches('.*@aiub\\.edu\\.bd');
      allow write: if request.auth.uid == userId;
    }
    
    match /rides/{rideId} {
      allow read, write: if request.auth != null;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.authorId;
    }
  }
}
```

### 5.2 Realtime Database Rules
Go to Realtime Database → Rules and paste:

```json
{
  "rules": {
    "active_riders": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid == $uid"
      }
    }
  }
}
```

## Step 6: Initialize Firestore Collections

Run this in Firebase Console → Firestore → Start Collection:

### Collection: fare_table
```json
{
  "main_gate_kuril": 40,
  "main_gate_badda": 30,
  "main_gate_rampura": 50,
  "main_gate_notun_bazar": 35,
  "main_gate_gulshan": 60,
  "main_gate_banani": 70,
  "main_gate_uttara": 55
}
```

## Step 7: Run the App

### Development Mode
```bash
# Start Expo
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

### Build for Production

#### Android APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

#### Production Release
```bash
# Build for Play Store
eas build --platform android --profile production
```

## Step 8: Test the App

### Test User Account
Create a test account:
- Email: test@aiub.edu.bd (use your actual AIUB email)
- Password: Test@123

### Test Features
1. ✅ Login with AIUB email
2. ✅ Select destination
3. ✅ Search for riders
4. ⏳ View live map
5. ⏳ Chat with riders
6. ⏳ Confirm ride
7. ⏳ Complete ride
8. ⏳ Rate partner

## 🐛 Troubleshooting

### Issue: Firebase not connecting
- Check `.env` file has correct credentials
- Verify `google-services.json` is in `android/app/`
- Rebuild app: `npm run android`

### Issue: Maps not showing
- Verify Google Maps API key is correct
- Check if Maps SDK is enabled in Google Cloud
- Ensure API key restrictions allow your app

### Issue: Location not working
- Check location permissions in Settings
- Ensure app has background location permission
- Verify `expo-location` is installed

### Issue: Build fails
- Clear cache: `expo start -c`
- Delete node_modules: `rm -rf node_modules && npm install`
- Update Expo: `npm install expo@latest`

## 📞 Support

For issues, contact: mozahid@aiub.edu.bd

---

**Next Steps**: Complete remaining screens and features! 🚀
