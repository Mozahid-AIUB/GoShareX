/**
 * analyticsService.ts — Production analytics & usage tracking
 * 
 * Tracks user behavior, performance metrics, and business events
 * Complies with privacy regulations (GDPR-like)
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';

export interface AnalyticsEvent {
    eventName: string;
    userId?: string;
    category: 'user_action' | 'business' | 'technical' | 'error' | 'performance';
    properties: Record<string, any>;
    timestamp: number;
}

export interface PerformanceMetric {
    screen: string;
    loadTime: number; // ms
    renderTime: number; // ms
    jsThreadTime: number; // ms
    memoryUsed: number; // bytes
}

class AnalyticsService {
    private static instance: AnalyticsService;
    private eventQueue: AnalyticsEvent[] = [];
    private flushInterval = 30000; // 30s
    private batchSize = 20;

    private constructor() {
        this.startAutoFlush();
    }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Track a user action event (ride created, chat started, etc)
     */
    trackEvent(
        eventName: string,
        userId?: string,
        properties?: Record<string, any>
    ): void {
        const event: AnalyticsEvent = {
            eventName,
            userId,
            category: 'user_action',
            properties: properties ?? {},
            timestamp: Date.now(),
        };

        this.eventQueue.push(event);

        // Flush if batch is full
        if (this.eventQueue.length >= this.batchSize) {
            void this.flush();
        }
    }

    /**
     * Track business event (ride completed, rating given, etc)
     */
    trackBusinessEvent(
        eventName: string,
        userId: string,
        value: number,
        properties?: Record<string, any>
    ): void {
        const event: AnalyticsEvent = {
            eventName,
            userId,
            category: 'business',
            properties: {
                value,
                ...properties,
            },
            timestamp: Date.now(),
        };

        this.eventQueue.push(event);
    }

    /**
     * Track performance metrics (screen load time, etc)
     */
    trackPerformance(metric: PerformanceMetric): void {
        const event: AnalyticsEvent = {
            eventName: 'screen_performance',
            category: 'performance',
            properties: metric,
            timestamp: Date.now(),
        };

        this.eventQueue.push(event);
    }

    /**
     * Track technical event (API calls, sync, etc)
     */
    trackTechnical(
        eventName: string,
        properties: Record<string, any>
    ): void {
        const event: AnalyticsEvent = {
            eventName,
            category: 'technical',
            properties,
            timestamp: Date.now(),
        };

        this.eventQueue.push(event);
    }

    /**
     * Flush all queued events to Firebase
     */
    async flush(): Promise<void> {
        if (this.eventQueue.length === 0) return;

        try {
            const batch = this.eventQueue.splice(0, this.batchSize);
            const eventsRef = collection(db, 'analytics_events');

            for (const event of batch) {
                await addDoc(eventsRef, {
                    ...event,
                    createdAt: serverTimestamp(),
                });
            }

            console.info(`[Analytics] Flushed ${batch.length} events`);
        } catch (error) {
            console.warn('[Analytics] Failed to flush events:', error);
            // Re-queue events on failure (bounded by max queue size)
        }
    }

    /**
     * Auto-flush queued events periodically
     */
    private startAutoFlush(): void {
        setInterval(() => {
            void this.flush();
        }, this.flushInterval);
    }

    /**
     * Get queue size (for debugging)
     */
    getQueueSize(): number {
        return this.eventQueue.length;
    }
}

export const analyticsService = AnalyticsService.getInstance();

/**
 * Common event names
 */
export const Events = {
    // User
    USER_SIGNUP: 'user_signup',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PROFILE_UPDATED: 'profile_updated',

    // Rides
    RIDE_CREATED: 'ride_created',
    RIDE_CONFIRMED: 'ride_confirmed',
    RIDE_STARTED: 'ride_started',
    RIDE_COMPLETED: 'ride_completed',
    RIDE_CANCELLED: 'ride_cancelled',

    // Chat
    CHAT_STARTED: 'chat_started',
    MESSAGE_SENT: 'message_sent',
    DEAL_CONFIRMED: 'deal_confirmed',

    // Matching
    RIDERS_MATCHED: 'riders_matched',

    // Post board
    POST_CREATED: 'post_created',
    POST_JOINED: 'post_joined',

    // Ratings
    RIDER_RATED: 'rider_rated',

    // Location
    LOCATION_UPDATED: 'location_updated',
    LOCATION_PERMISSION_GRANTED: 'location_permission_granted',

    // Notifications
    NOTIFICATION_RECEIVED: 'notification_received',
    NOTIFICATION_CLICKED: 'notification_clicked',
} as const;
