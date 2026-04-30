/**
 * Audit Logging Service
 * Server-side logging for sensitive operations via Cloud Functions
 * Client-side helpers for triggering audit events
 */

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { logger } from './logger';

export interface AuditLog {
    userId: string;
    action: string;           // CREATE_RATING, UPDATE_BADGE, CANCEL_RIDE, etc
    resource: string;         // ride/{rideId}, user/{userId}, etc
    resourceId: string;       // Specific ID (rideId, userId, etc)
    changes?: Record<string, any>;
    status: 'success' | 'failure';
    errorMessage?: string;
    timestamp: Timestamp;
    ipAddress?: string;       // Server-side only
    userAgent?: string;       // Server-side only
}

class AuditService {
    /**
     * Log an audit event
     * Sent to Firestore for processing by Cloud Functions
     */
    async logEvent(
        userId: string,
        action: string,
        resource: string,
        resourceId: string,
        changes?: Record<string, any>,
        status: 'success' | 'failure' = 'success',
        errorMessage?: string
    ): Promise<void> {
        try {
            const auditRef = collection(db, 'audit_logs');
            await addDoc(auditRef, {
                userId,
                action,
                resource,
                resourceId,
                changes: changes ?? {},
                status,
                errorMessage: errorMessage ?? null,
                timestamp: serverTimestamp(),
                clientTimestamp: Date.now(),
            } as Omit<AuditLog, 'timestamp'> & { clientTimestamp: number });

            logger.debug('Audit logged', { action, resource, status });
        } catch (error) {
            logger.error('auditLog', error, { action, resource });
            // Don't throw — audit failure shouldn't block the operation
        }
    }

    /**
     * Log rating operation
     */
    async logRating(
        riderId: string,
        rideId: string,
        targetUserId: string,
        stars: number,
        comment?: string
    ): Promise<void> {
        await this.logEvent(
            riderId,
            'CREATE_RATING',
            'ride',
            rideId,
            { stars, comment, targetUserId }
        );
    }

    /**
     * Log badge change
     */
    async logBadgeChange(
        userId: string,
        oldBadge: string,
        newBadge: string,
        totalRides: number
    ): Promise<void> {
        await this.logEvent(
            userId,
            'UPDATE_BADGE',
            'user',
            userId,
            { oldBadge, newBadge, totalRides }
        );
    }

    /**
     * Log ride cancellation
     */
    async logRideCancel(
        userId: string,
        rideId: string,
        rider1: string,
        rider2: string,
        reason: string
    ): Promise<void> {
        await this.logEvent(
            userId,
            'CANCEL_RIDE',
            'ride',
            rideId,
            { cancelledBy: userId, rider1, rider2, reason }
        );
    }

    /**
     * Log ride completion
     */
    async logRideComplete(
        rider1Id: string,
        rider2Id: string,
        rideId: string,
        fare: number,
        splitAmount: number,
        duration: number
    ): Promise<void> {
        await this.logEvent(
            rider1Id,
            'COMPLETE_RIDE',
            'ride',
            rideId,
            { rider1: rider1Id, rider2: rider2Id, fare, splitAmount, durationMs: duration }
        );
        // Also log for rider2
        await this.logEvent(
            rider2Id,
            'COMPLETE_RIDE',
            'ride',
            rideId,
            { rider1: rider1Id, rider2: rider2Id, fare, splitAmount, durationMs: duration }
        );
    }

    /**
     * Log penalty strike
     */
    async logPenaltyStrike(
        userId: string,
        reason: string,
        strikeCount: number
    ): Promise<void> {
        await this.logEvent(
            userId,
            'ADD_STRIKE',
            'user',
            userId,
            { reason, strikeCount, totalStrikes: strikeCount }
        );
    }

    /**
     * Log user suspension
     */
    async logSuspension(
        userId: string,
        reason: string,
        suspensionDurationMs: number
    ): Promise<void> {
        await this.logEvent(
            userId,
            'SUSPEND_USER',
            'user',
            userId,
            { reason, suspensionDurationMs }
        );
    }

    /**
     * Log login attempt
     */
    async logLogin(userId: string, success: boolean, error?: string): Promise<void> {
        await this.logEvent(
            userId,
            'LOGIN',
            'auth',
            userId,
            { success },
            success ? 'success' : 'failure',
            error
        );
    }

    /**
     * Log user report/complaint
     */
    async logReport(
        reporterId: string,
        reportedUserId: string,
        reason: string,
        rideId?: string
    ): Promise<void> {
        await this.logEvent(
            reporterId,
            'SUBMIT_REPORT',
            'user',
            reportedUserId,
            { reporterId, reportedUserId, reason, rideId }
        );
    }
}

export const auditService = new AuditService();
