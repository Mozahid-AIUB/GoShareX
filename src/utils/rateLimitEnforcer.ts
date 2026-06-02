/**
 * CLIENT-SIDE RATE LIMITING ENFORCER
 * Checks server-side rate limits before performing expensive operations
 * 
 * Usage:
 * - Call before ride creation, messages, searches
 * - Prevents hammering the server
 * - Provides user feedback on rate limits
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase.config';
import { logger } from './logger';

interface RateLimitConfig {
    action: string;
    tokensRequired?: number;
    onLimit?: () => void; // Callback if rate limited
}

/**
 * Check if operation is allowed
 * @param config Rate limit configuration
 * @returns true if allowed, false if rate limited
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<boolean> {
    try {
        const checkRateLimitFn = httpsCallable(functions, 'checkRateLimit');

        const result = await checkRateLimitFn({
            action: config.action,
            tokensRequired: config.tokensRequired || 1,
        } as Record<string, any>);

        if ((result.data as any)?.allowed) {
            return true;
        }

        config.onLimit?.();
        return false;
    } catch (error: any) {
        const errorCode = error?.code;

        if (errorCode === 'resource-exhausted') {
            // Rate limited
            logger.warn('Rate limit exceeded', { action: config.action });
            config.onLimit?.();
            return false;
        }

        if (errorCode === 'unauthenticated') {
            logger.error('User not authenticated for rate check', new Error('Unauthenticated'));
            return false;
        }

        // Other errors — fail open (allow) but log
        logger.error('Rate limit check failed', error);
        return true;
    }
}

/**
 * DECORATORS & WRAPPERS for common operations
 */

/**
 * Wrap a ride creation function with rate limiting
 */
export async function withRideLimitCheck<T>(
    fn: () => Promise<T>,
    onLimit?: () => void
): Promise<T> {
    const allowed = await checkRateLimit({
        action: 'create_ride',
        tokensRequired: 1,
        onLimit,
    });

    if (!allowed) {
        throw new Error('Too many rides requested. Please wait a moment and try again.');
    }

    return fn();
}

/**
 * Wrap message sending with rate limiting
 */
export async function withMessageLimitCheck<T>(
    fn: () => Promise<T>,
    onLimit?: () => void
): Promise<T> {
    const allowed = await checkRateLimit({
        action: 'send_message',
        tokensRequired: 1,
        onLimit,
    });

    if (!allowed) {
        throw new Error('Too many messages. Please wait a moment.');
    }

    return fn();
}

/**
 * Wrap search with rate limiting
 */
export async function withSearchLimitCheck<T>(
    fn: () => Promise<T>,
    onLimit?: () => void
): Promise<T> {
    const allowed = await checkRateLimit({
        action: 'search_rides',
        tokensRequired: 1,
        onLimit,
    });

    if (!allowed) {
        throw new Error('Too many searches. Please wait a moment.');
    }

    return fn();
}

/**
 * Wrap rating with rate limiting
 */
export async function withRatingLimitCheck<T>(
    fn: () => Promise<T>,
    onLimit?: () => void
): Promise<T> {
    const allowed = await checkRateLimit({
        action: 'rate_user',
        tokensRequired: 1,
        onLimit,
    });

    if (!allowed) {
        throw new Error('Too many ratings. Please try again later.');
    }

    return fn();
}

/**
 * Rate limit state management (for UI)
 */
export interface RateLimitStatus {
    action: string;
    remaining: number;
    resetAt: number;
    isLimited: boolean;
}

// In-memory cache of rate limit status (updated on each check)
const rateLimitCache = new Map<string, RateLimitStatus>();

export function getRateLimitStatus(action: string): RateLimitStatus | null {
    return rateLimitCache.get(action) || null;
}

export function setRateLimitStatus(action: string, status: RateLimitStatus): void {
    rateLimitCache.set(action, status);
}
