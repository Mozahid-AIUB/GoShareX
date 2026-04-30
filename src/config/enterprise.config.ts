/**
 * config/enterprise.config.ts — Enterprise configuration
 * 
 * Centralized configuration for production environment
 */

export const enterpriseConfig = {
    // ─── Security ──────────────────────────────────────────────────────────────
    security: {
        // Password requirements
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,

        // Session management
        sessionTimeoutMinutes: 30, // Auto-logout after 30 min inactivity
        maxConcurrentSessions: 1, // One session per user

        // Encryption
        enableE2E: false, // End-to-end encryption (future)
    },

    // ─── Rate Limiting ─────────────────────────────────────────────────────────
    rateLimits: {
        // API calls
        apiCallsPerMinute: 100,
        apiCallsPerHour: 5000,

        // Messaging
        messagesPerMinute: 10,
        messagesPerHour: 200,

        // Authentication
        loginAttemptsPerHour: 5,
        registerAttemptsPerHour: 3,

        // Location updates
        locationUpdatesPerMinute: 12, // 5-second interval
    },

    // ─── Feature Flags ───────────────────────────────────────────────────────────
    features: {
        // Core features
        enableMobileApp: true,
        enableWebApp: false,

        // Advanced features
        enableGeofencing: true,
        enablePushNotifications: true,
        enableRealtimeTracking: true,
        enableRatings: true,
        enableReports: true,

        // Experimental
        enableAI: false, // ML-based matching
        enableBlockchain: false, // Blockchain verification
    },

    // ─── Performance ────────────────────────────────────────────────────────────
    performance: {
        // Screen load warnings
        slowScreenThreshold: 2000, // ms
        slowAPIThreshold: 3000, // ms

        // Cache settings
        cacheExpiry: {
            user: 3600000, // 1 hour
            rides: 300000, // 5 minutes
            fares: 86400000, // 24 hours
            posts: 600000, // 10 minutes
        },

        // Batch operations
        maxBatchSize: 25,
        batchTimeout: 5000,
    },

    // ─── Analytics ─────────────────────────────────────────────────────────────
    analytics: {
        enabled: true,
        flushInterval: 30000, // 30 seconds
        maxLocalEvents: 500,

        // Disable analytics for non-essential events in low-bandwidth mode
        samplingRate: 1, // 100% (0.1 = 10%)
    },

    // ─── Error Handling ────────────────────────────────────────────────────────
    errors: {
        // Capture & reporting
        captureUnhandledRejections: true,
        captureUnhandledErrors: true,

        // Logging
        maxLocalErrorLogs: 50,
        enableStackTraces: true,

        // User-facing
        showDetailedErrors: false, // Don't expose internal errors to users
    },

    // ─── Monitoring ────────────────────────────────────────────────────────────
    monitoring: {
        enabled: true,
        healthCheckInterval: 300000, // 5 minutes
        errorReportingEnabled: true,
    },

    // ─── Database ──────────────────────────────────────────────────────────────
    database: {
        // Firestore
        enableOfflineSync: true,
        enableCascadingDeletes: true,

        // Realtime DB
        maxConnectionTimeout: 10000, // 10 seconds
        reconnectDelay: 1000, // 1 second
        maxReconnectAttempts: 5,
    },

    // ─── API & Backend ────────────────────────────────────────────────────────
    api: {
        // Base URLs
        baseURL: 'https://api.gosharex.com', // Change in .env
        apiVersion: 'v1',

        // Timeout
        defaultTimeout: 30000, // 30 seconds

        // Retries
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
    },

    // ─── Geofencing ────────────────────────────────────────────────────────────
    geofencing: {
        enabled: true,
        radius: 100, // meters - auto-complete ride when user enters destination boundary
        fenceCheckInterval: 10000, // 10 seconds
    },

    // ─── Location ──────────────────────────────────────────────────────────────
    location: {
        updateInterval: 5000, // 5 seconds
        enableHighAccuracy: true,
        enableBackground: true,
        maxAge: 10000, // 10 seconds
    },

    // ─── Maintenance ──────────────────────────────────────────────────────────
    maintenance: {
        enabled: false,
        message: 'App is under maintenance. Please try again later.',
        estimatedDuration: 30, // minutes
    },

    // ─── Versioning ───────────────────────────────────────────────────────────
    versioning: {
        appVersion: '1.0.0',
        apiVersion: 'v1',
        minSupportedVersion: '0.9.0',
    },

    // ─── Compliance ────────────────────────────────────────────────────────────
    compliance: {
        gdprEnabled: true,
        privacyPolicyURL: 'https://gosharex.com/privacy',
        termsOfServiceURL: 'https://gosharex.com/terms',
        dataRetentionDays: 90, // Auto-delete after 90 days
    },
} as const;

// ─── Environment-specific overrides ─────────────────────────────────────────

const env = process.env.NODE_ENV || 'development';

if (env === 'production') {
    // Production settings
    Object.assign(enterpriseConfig.security, {
        sessionTimeoutMinutes: 15, // Stricter in production
    });

    Object.assign(enterpriseConfig.errors, {
        showDetailedErrors: false,
    });

    Object.assign(enterpriseConfig.analytics, {
        enabled: true,
        samplingRate: 0.5, // Sample 50% of events to reduce load
    });
}

if (env === 'development') {
    // Development settings
    Object.assign(enterpriseConfig.errors, {
        showDetailedErrors: true,
    });

    Object.assign(enterpriseConfig.maintenance, {
        enabled: false,
    });
}

export default enterpriseConfig;
