import 'dotenv/config';

export default {
    expo: {
        name: "GoShareX",
        slug: "gosharex",
        version: "1.0.1",
        scheme: "gosharex",
        orientation: "portrait",
        privacy: "unlisted",
        icon: "./assets/images/icon.png",
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
                "ACCESS_BACKGROUND_LOCATION",
                "VIBRATE",
                "RECEIVE_BOOT_COMPLETED"
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
            "expo-location",
            "expo-notifications",
            "expo-secure-store",
            "expo-updates",
            "@react-native-google-signin/google-signin",
            [
                "expo-splash-screen",
                {
                    image: "./assets/images/gosharex-matrix-splash.png",
                    backgroundColor: "#07122B",
                    imageWidth: 240,
                    resizeMode: "contain",
                    dark: {
                        image: "./assets/images/gosharex-matrix-splash.png",
                        backgroundColor: "#07122B"
                    }
                }
            ],
            [
                "expo-build-properties",
                {
                    android: {
                        compileSdkVersion: 35,
                        targetSdkVersion: 35,
                        buildToolsVersion: "35.0.0"
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
