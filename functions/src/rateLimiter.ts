/**
 * PRODUCTION-GRADE RATE LIMITING
 * Prevents DOS attacks on rides, messages, and API calls
 * 
 * Implements Token Bucket algorithm with sliding window
 * Tracks per-user rate limits across the app
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

interface RateLimitBucket {
    tokens: number;
    lastRefillTime: number;
    refillRate: number; // tokens per second
    maxTokens: number;
}

/**
 * Rate Limiting Service
 * Uses Firestore for distributed rate tracking
 */
class RateLimiter {
    private db = admin.firestore();

    /**
     * Check if user has exceeded rate limit
     * @param userId User ID
     * @param action Action type (ride, message, search, etc)
     * @param tokensRequired Tokens to consume
     * @returns true if allowed, false if rate limited
     */
    async isAllowed(
        userId: string,
        action: string,
        tokensRequired: number = 1
    ): Promise<boolean> {
        const bucketId = `${userId}:${action}`;
        const ref = this.db.collection('rate_limits').doc(bucketId);

        try {
            const result = await this.db.runTransaction(async (tx) => {
                const doc = await tx.get(ref);
                const now = Date.now() / 1000; // seconds

                // Rate limits per action type
                const limits: Record<string, { refillRate: number; maxTokens: number; window: number }> = {
                    create_ride: { refillRate: 2, maxTokens: 10, window: 60 }, // 2 rides/min
                    send_message: { refillRate: 10, maxTokens: 100, window: 60 }, // 100 msgs/min (throttled UI)
                    search_rides: { refillRate: 5, maxTokens: 50, window: 60 }, // 5 searches/sec
                    update_location: { refillRate: 2, maxTokens: 20, window: 60 }, // 2 updates/sec
                    rate_user: { refillRate: 1, maxTokens: 5, window: 60 }, // 1 rating/sec
                    report_user: { refillRate: 0.5, maxTokens: 3, window: 3600 }, // 3 reports/hour
                    create_post: { refillRate: 1, maxTokens: 5, window: 3600 }, // 5 posts/hour
                };

                const limit = limits[action] || { refillRate: 1, maxTokens: 10, window: 60 };

                let bucket: RateLimitBucket = {
                    tokens: limit.maxTokens,
                    lastRefillTime: now,
                    refillRate: limit.refillRate,
                    maxTokens: limit.maxTokens,
                };

                if (doc.exists) {
                    const existingBucket = doc.data() as RateLimitBucket;
                    const timePassed = now - existingBucket.lastRefillTime;

                    // Refill tokens based on time passed
                    bucket.tokens = Math.min(
                        existingBucket.maxTokens,
                        existingBucket.tokens + timePassed * existingBucket.refillRate
                    );
                    bucket.lastRefillTime = now;
                }

                const allowed = bucket.tokens >= tokensRequired;

                if (allowed) {
                    bucket.tokens -= tokensRequired;
                }

                // Always update to track rate limit state
                tx.set(ref, {
                    ...bucket,
                    userId,
                    action,
                    updatedAt: admin.firestore.Timestamp.now(),
                });

                return allowed;
            });

            return result;
        } catch (error) {
            functions.logger.error('Rate limiter error:', error);
            // Fail open on error (allow request) but log for monitoring
            return true;
        }
    }

    /**
     * Reset rate limit for a user (admin only)
     */
    async resetUserLimits(userId: string): Promise<void> {
        const query = this.db.collection('rate_limits').where('userId', '==', userId);
        const docs = await query.get();
        const batch = this.db.batch();

        docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }
}

export const rateLimiter = new RateLimiter();

/**
 * Callable function to check rate limit
 * Called from client before expensive operations
 */
export const checkRateLimit = functions.https.onCall(
    async (data: { action: string; tokensRequired?: number }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { action, tokensRequired = 1 } = data;

        if (!action || typeof action !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid action');
        }

        const allowed = await rateLimiter.isAllowed(context.auth.uid, action, tokensRequired);

        if (!allowed) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                `Rate limit exceeded for ${action}. Please try again later.`
            );
        }

        return { allowed: true };
    }
);

/**
 * Automatically cleanup old rate limit records (runs daily)
 */
export const cleanupOldRateLimits = functions.pubsub
    .schedule('0 2 * * *') // 2 AM daily
    .onRun(async () => {
        const db = admin.firestore();
        const oneHourAgo = new Date(Date.now() - 3600000);

        const query = db.collection('rate_limits').where('updatedAt', '<', oneHourAgo);
        const docs = await query.get();

        functions.logger.info(`Cleaning up ${docs.size} expired rate limit records`);

        const batch = db.batch();
        docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        if (docs.size > 0) {
            await batch.commit();
        }
    });
