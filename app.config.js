import 'dotenv/config';

export default {
    expo: {
        name: "GoShareX",
        slug: "rideshare-aiub",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        splash: {
            image: "./assets/images/splash.png",
            resizeMode: "contain",
            backgroundColor: "#1A73E8"
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#1A73E8"
            },
            package: "com.aiub.rideshare",
            permissions: [
                "ACCESS_FINE_LOCATION",
                "ACCESS_COARSE_LOCATION",
                "ACCESS_BACKGROUND_LOCATION",
                "VIBRATE",
                "RECEIVE_BOOT_COMPLETED"
            ],
            googleServicesFile: "./google-services.json"
        },
        plugins: [
            "expo-location",
            "expo-notifications",
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
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
            eas: {
                projectId: "your-eas-project-id"
            }
        }
    }
};