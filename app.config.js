import 'dotenv/config';

export default {
    expo: {
        name: "GoShareX",
        slug: "gosharex",
        version: "1.0.1",
        scheme: "gosharex",
        orientation: "portrait",
        privacy: "unlisted",
        icon: "./assets/images/gosharex-icon-3d.png",
        userInterfaceStyle: "light",
        updates: {
            url: "https://u.expo.dev/cfddb17a-f7c5-4700-a526-85456ce48212",
            fallbackToCacheTimeout: 0
        },
        runtimeVersion: {
            policy: "appVersion"
        },
        // CRITICAL: react-native-maps 1.20.1 New Architecture-এ Turbo Module
        // init-এ hang করে (libturbomodulejsijni load-এর পর splash freeze —
        // "on হয়েই off")। এটা আগে শুধু android/gradle.properties-এ ছিল, যেটা
        // EAS clean-prebuild-এ হারিয়ে যেতে পারে। এখানে app.config.js-এ রাখলে
        // EAS সবসময় এটা সম্মান করবে, local gradle.properties যাই থাকুক।
        newArchEnabled: false,
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#FFFFFF"
            },
            // keyboard খুললে view resize হয় (input keyboard-এর উপরে স্থির থাকে,
            // jump করে না) — chat screen-এর জন্য জরুরি।
            softwareKeyboardLayoutMode: "resize",
            package: "com.gosharex.app",
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY
                }
            },
            permissions: [
                "ACCESS_FINE_LOCATION",
                "ACCESS_COARSE_LOCATION",
                "VIBRATE",
                "RECEIVE_BOOT_COMPLETED"
            ],
            // Play policy: no background location (needs a declaration video),
            // and expo-camera / expo-image-picker are installed but unused —
            // strip the permissions their library manifests merge in.
            blockedPermissions: [
                "android.permission.ACCESS_BACKGROUND_LOCATION",
                "android.permission.CAMERA",
                "android.permission.RECORD_AUDIO",
                "android.permission.READ_EXTERNAL_STORAGE",
                "android.permission.WRITE_EXTERNAL_STORAGE"
            ],
            googleServicesFile: "./google-services.json",
            intentFilters: [],
            allowBackup: false,
        },
        ios: {
            bundleIdentifier: "com.gosharex.app",
            config: {
                googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
            }
        },
        plugins: [
            [
                "expo-location",
                {
                    locationWhenInUsePermission: "GoShareX uses your location while the app is open to show nearby riders, match you with co-riders and share your live location with your ride partner.",
                    isAndroidBackgroundLocationEnabled: false,
                    isAndroidForegroundServiceEnabled: false,
                    isIosBackgroundLocationEnabled: false
                }
            ],
            "expo-notifications",
            "expo-secure-store",
            "expo-updates",
            "@react-native-google-signin/google-signin",
            // SDK 54-এ Android edge-to-edge default enabled — এই মোডে
            // নিচের navigation bar-এর কোনো স্বতন্ত্র solid রঙ থাকে না
            // (transparent, content এর নিচ পর্যন্ত extend হয়)। পুরনো
            // expo-navigation-bar/expo-status-bar imperative API এই
            // মোডে no-op — icon color (light/dark) নিয়ন্ত্রণ করতে হয়
            // react-native-edge-to-edge-এর SystemBars component দিয়ে।
            // প্লাগিন explicit options সহ বসানো হলো (plain string আগে ছিল) —
            // enforceNavigationBarContrast: false না দিলে Android নিজে
            // থেকে nav bar-এ একটা আলাদা contrast overlay বসিয়ে দেয়, যেটা
            // tab bar background-এর সাথে না মিলে আলাদা "layer" এর মতো লাগে।
            [
                "react-native-edge-to-edge",
                {
                    android: {
                        parentTheme: "Default",
                        enforceNavigationBarContrast: false
                    }
                }
            ],
            [
                "expo-splash-screen",
                {
                    // Android 12+ SplashScreen API icon-কে একটা ছোট round
                    // container-এ বসায় (adaptive icon-এর মতোই সীমাবদ্ধতা) —
                    // আগের gosharex-icon-3d.png প্রায় পুরো ফ্রেম জুড়ে থাকায়
                    // সেই round mask-এ কেটে যাচ্ছিল। gosharex-splash-icon.png
                    // logo-কে ছোট করে (৫০% fit-zone) padding সহ কেন্দ্রে
                    // বসানো — এখন mask-এ কোনো অংশ কাটে না।
                    image: "./assets/images/gosharex-splash-icon.png",
                    backgroundColor: "#FFFFFF",
                    imageWidth: 200,
                    resizeMode: "contain",
                    dark: {
                        image: "./assets/images/gosharex-splash-icon.png",
                        backgroundColor: "#FFFFFF"
                    }
                }
            ],
            [
                "expo-build-properties",
                {
                    android: {
                        compileSdkVersion: 36,
                        targetSdkVersion: 36,
                        buildToolsVersion: "36.0.0"
                    }
                }
            ]
        ],
        extra: {
            eas: {
                projectId: "cfddb17a-f7c5-4700-a526-85456ce48212"
            },
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
            GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
            GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
            GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
            GOOGLE_ROUTES_API_KEY: process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
            GOOGLE_DIRECTIONS_API_KEY: process.env.GOOGLE_DIRECTIONS_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
            GOOGLE_DISTANCE_MATRIX_API_KEY: process.env.GOOGLE_DISTANCE_MATRIX_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
            GRAPHHOPPER_API_KEY: process.env.GRAPHHOPPER_API_KEY,
        }
    }
};
