/**
 * Rate Limiting Utility
 * Prevent abuse by throttling API calls and actions
 * Uses in-memory storage for instant lookups
 */

interface RateLimitEntry {
    timestamps: number[];
    lastCleanup: number;
}

class RateLimiter {
    private attempts: Map<string, RateLimitEntry> = new Map();
    private readonly cleanupIntervalMs = 60000; // 1 minute

    constructor() {
        // Cleanup old entries periodically
        setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    }

    /**
     * Check if an action is allowed under rate limit
     * @param key Unique identifier (e.g., "create-ride-user123")
     * @param maxAttempts Max attempts allowed in the window
     * @param windowMs Time window in milliseconds
     * @returns true if allowed, false if rate limited
     */
    isAllowed(key: string, maxAttempts: number = 3, windowMs: number = 1000): boolean {
        const now = Date.now();
        const entry = this.attempts.get(key) ?? { timestamps: [], lastCleanup: now };

        // Remove timestamps outside the window
        entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

        // Check if limit exceeded
        if (entry.timestamps.length >= maxAttempts) {
            return false;
        }

        // Add current attempt
        entry.timestamps.push(now);
        entry.lastCleanup = now;
        this.attempts.set(key, entry);

        return true;
    }

    /**
     * Get remaining attempts before rate limit
     */
    getRemaining(key: string, maxAttempts: number = 3, windowMs: number = 1000): number {
        const now = Date.now();
        const entry = this.attempts.get(key);

        if (!entry) return maxAttempts;

        const recent = entry.timestamps.filter(t => now - t < windowMs);
        return Math.max(0, maxAttempts - recent.length);
    }

    /**
     * Get time until rate limit is reset
     */
    getResetTime(key: string, windowMs: number = 1000): number {
        const now = Date.now();
        const entry = this.attempts.get(key);

        if (!entry || entry.timestamps.length === 0) return 0;

        const oldest = Math.min(...entry.timestamps);
        const resetTime = oldest + windowMs;
        return Math.max(0, resetTime - now);
    }

    /**
     * Reset counter for a specific key
     */
    reset(key: string): void {
        this.attempts.delete(key);
    }

    /**
     * Clean up old entries (called automatically)
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.attempts) {
            // Remove entries older than 5 minutes
            if (now - entry.lastCleanup > 5 * 60 * 1000) {
                this.attempts.delete(key);
            }
        }
    }

    /**
     * Clear all rate limit data
     */
    clear(): void {
        this.attempts.clear();
    }
}

export const rateLimiter = new RateLimiter();

/**
 * Preset rate limits for common actions
 */
export const RATE_LIMITS = {
    // Authentication
    LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },           // 5 per 15 min
    REGISTER: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },        // 3 per hour
    PASSWORD_RESET: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },  // 3 per hour

    // Rides
    CREATE_RIDE: { maxAttempts: 10, windowMs: 60 * 1000 },         // 10 per minute
    CANCEL_RIDE: { maxAttempts: 5, windowMs: 60 * 1000 },          // 5 per minute
    RATE_RIDE: { maxAttempts: 20, windowMs: 60 * 1000 },           // 20 per minute

    // Chat & Social
    SEND_MESSAGE: { maxAttempts: 30, windowMs: 60 * 1000 },        // 30 per minute
    CREATE_POST: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },     // 5 per hour

    // Location
    UPDATE_LOCATION: { maxAttempts: 20, windowMs: 1000 },          // 20 per second

    // Reports
    SUBMIT_REPORT: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },  // 10 per hour
};

/**
 * Helper to check rate limit with preset
 */
export function checkRateLimit(action: string, userId: string, preset: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]): { allowed: boolean; remaining: number; resetMs: number } {
    const key = `${action}:${userId}`;
    const allowed = rateLimiter.isAllowed(key, preset.maxAttempts, preset.windowMs);
    const remaining = rateLimiter.getRemaining(key, preset.maxAttempts, preset.windowMs);
    const resetMs = rateLimiter.getResetTime(key, preset.windowMs);

    return { allowed, remaining, resetMs };
}

/**
 * Throw error if rate limited
 */
export function enforceRateLimit(action: string, userId: string, preset: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]): void {
    const { allowed, remaining, resetMs } = checkRateLimit(action, userId, preset);

    if (!allowed) {
        const resetSec = Math.ceil(resetMs / 1000);
        throw new Error(`Too many ${action} requests. Try again in ${resetSec}s.`);
    }
}
