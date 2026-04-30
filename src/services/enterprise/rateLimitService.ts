/**
 * rateLimitService.ts — Prevent abuse and overuse
 * 
 * - Rate limit API calls per user
 * - Prevent spam (message flooding, rapid requests)
 * - Gradual backoff
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_LIMITS_KEY = 'gosharex_rate_limits_v1';

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // milliseconds
    blockDurationMs?: number; // how long to block if exceeded
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    // Messaging
    send_message: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    send_notification: { maxRequests: 5, windowMs: 60000 }, // 5 per minute

    // Ride operations
    create_ride: { maxRequests: 3, windowMs: 300000 }, // 3 per 5 minutes
    confirm_deal: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
    cancel_ride: { maxRequests: 3, windowMs: 300000 }, // 3 per 5 minutes

    // Auth
    login_attempt: { maxRequests: 5, windowMs: 900000 }, // 5 per 15 minutes
    register_attempt: { maxRequests: 3, windowMs: 900000 }, // 3 per 15 minutes

    // Location updates
    update_location: { maxRequests: 12, windowMs: 60000 }, // 12 per minute (5s interval)

    // API calls
    api_call: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
};

interface RateLimitRecord {
    action: string;
    userId: string;
    count: number;
    windowStart: number;
    blocked?: boolean;
    blockedUntil?: number;
}

class RateLimitService {
    private static instance: RateLimitService;
    private inMemoryCache: Map<string, RateLimitRecord> = new Map();

    private constructor() { }

    static getInstance(): RateLimitService {
        if (!RateLimitService.instance) {
            RateLimitService.instance = new RateLimitService();
        }
        return RateLimitService.instance;
    }

    /**
     * Check if action is rate limited
     * Returns true if allowed, false if rate limited
     */
    async isAllowed(action: string, userId: string): Promise<boolean> {
        const config = DEFAULT_CONFIGS[action];
        if (!config) return true; // No limit defined, allow

        const cacheKey = `${action}:${userId}`;

        // Check if currently blocked
        const record = this.inMemoryCache.get(cacheKey);
        if (record?.blocked && record.blockedUntil && record.blockedUntil > Date.now()) {
            console.warn(`[RateLimit] User ${userId} blocked for action ${action}`);
            return false;
        }

        // Check window
        const now = Date.now();
        const windowElapsed = now - (record?.windowStart ?? 0);

        if (windowElapsed > config.windowMs) {
            // Reset window
            const newRecord: RateLimitRecord = {
                action,
                userId,
                count: 1,
                windowStart: now,
            };
            this.inMemoryCache.set(cacheKey, newRecord);
            return true;
        }

        // Within window
        if (!record) {
            this.inMemoryCache.set(cacheKey, {
                action,
                userId,
                count: 1,
                windowStart: now,
            });
            return true;
        }

        record.count += 1;

        if (record.count > config.maxRequests) {
            record.blocked = true;
            record.blockedUntil = now + (config.blockDurationMs ?? 60000);
            console.warn(
                `[RateLimit] User ${userId} exceeded rate limit for ${action}: ${record.count}/${config.maxRequests}`
            );
            return false;
        }

        return true;
    }

    /**
     * Reset rate limit for a user (admin only)
     */
    resetForUser(userId: string): void {
        const keysToDelete = Array.from(this.inMemoryCache.keys()).filter((key) =>
            key.endsWith(`:${userId}`)
        );
        keysToDelete.forEach((key) => this.inMemoryCache.delete(key));
    }

    /**
     * Get current rate limit status
     */
    getStatus(action: string, userId: string): {
        allowed: boolean;
        count: number;
        max: number;
        windowMs: number;
        remainingMs: number;
    } | null {
        const config = DEFAULT_CONFIGS[action];
        if (!config) return null;

        const cacheKey = `${action}:${userId}`;
        const record = this.inMemoryCache.get(cacheKey);
        const now = Date.now();

        if (!record || now - record.windowStart > config.windowMs) {
            return {
                allowed: true,
                count: 0,
                max: config.maxRequests,
                windowMs: config.windowMs,
                remainingMs: config.windowMs,
            };
        }

        return {
            allowed: record.count <= config.maxRequests,
            count: record.count,
            max: config.maxRequests,
            windowMs: config.windowMs,
            remainingMs: Math.max(0, config.windowMs - (now - record.windowStart)),
        };
    }

    /**
     * Clear all limits (debug only)
     */
    clearAll(): void {
        this.inMemoryCache.clear();
    }
}

export const rateLimitService = RateLimitService.getInstance();

/**
 * Decorator for rate-limited functions
 */
export function RateLimited(action: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const userId = args[0]?.userId || 'anonymous';
            const allowed = await rateLimitService.isAllowed(action, userId);

            if (!allowed) {
                const error = new Error(`Rate limit exceeded for ${action}`);
                (error as any).code = 'RATE_LIMIT_EXCEEDED';
                throw error;
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}

/**
 * Helper to check rate limit before async operation
 */
export async function checkRateLimit(action: string, userId: string): Promise<void> {
    const allowed = await rateLimitService.isAllowed(action, userId);
    if (!allowed) {
        const error = new Error(`Rate limit exceeded for ${action}`);
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        throw error;
    }
}
