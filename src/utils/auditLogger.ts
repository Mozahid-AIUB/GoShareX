/**
 * ENHANCED AUDIT LOGGING
 * Logs all sensitive operations for security monitoring and compliance
 * 
 * Logged Events:
 * - User login/logout
 * - Permission changes
 * - Data modifications
 * - Suspension/penalties
 * - Reports and disputes
 * - API access
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase.config';
import { logger } from './logger';

export enum AuditEventType {
    // Authentication
    USER_LOGIN = 'user_login',
    USER_LOGOUT = 'user_logout',
    PASSWORD_CHANGE = 'password_change',
    EMAIL_VERIFIED = 'email_verified',

    // Account Management
    PROFILE_UPDATE = 'profile_update',
    PHOTO_UPLOAD = 'photo_upload',
    ACCOUNT_DELETE = 'account_delete',

    // Rides
    RIDE_CREATED = 'ride_created',
    RIDE_CONFIRMED = 'ride_confirmed',
    RIDE_COMPLETED = 'ride_completed',
    RIDE_CANCELLED = 'ride_cancelled',

    // Chat
    CHAT_CREATED = 'chat_created',
    MESSAGE_SENT = 'message_sent',
    MESSAGE_DELETED = 'message_deleted',

    // Ratings & Reviews
    RATING_GIVEN = 'rating_given',
    RATING_REMOVED = 'rating_removed',

    // User Reports
    USER_REPORTED = 'user_reported',
    REPORT_REVIEWED = 'report_reviewed',

    // Penalties
    PENALTY_APPLIED = 'penalty_applied',
    PENALTY_REMOVED = 'penalty_removed',
    USER_SUSPENDED = 'user_suspended',
    USER_UNSUSPENDED = 'user_unsuspended',

    // Admin Actions
    ADMIN_OVERRIDE = 'admin_override',

    // Privacy
    PRIVACY_SETTING_CHANGED = 'privacy_setting_changed',
    DATA_EXPORT_REQUESTED = 'data_export_requested',
    ANONYMOUS_MODE_ENABLED = 'anonymous_mode_enabled',

    // API
    API_KEY_USED = 'api_key_used',
    RATE_LIMIT_HIT = 'rate_limit_hit',
}

export interface AuditLogEntry {
    eventType: AuditEventType;
    userId: string;
    targetUserId?: string; // For actions affecting other users
    rideId?: string;
    chatId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Client-side audit log function
 * Sends events to Cloud Function for server-side logging
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        // Get device info (sanitized)
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'mobile';

        const logAuditFn = httpsCallable(functions, 'logAuditEvent');
        await logAuditFn({
            eventType: entry.eventType,
            userId: entry.userId,
            targetUserId: entry.targetUserId,
            rideId: entry.rideId,
            chatId: entry.chatId,
            details: entry.details,
            userAgent: userAgent.substring(0, 200), // Limit length
            severity: entry.severity || 'info',
        });
    } catch (error) {
        // Don't throw — audit logging failure shouldn't break the app
        logger.warn('Audit log failed', error);
    }
}

/**
 * Log user login event
 */
export async function logLogin(userId: string, email: string): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.USER_LOGIN,
        userId,
        details: { email },
        severity: 'info',
    });
}

/**
 * Log user logout event
 */
export async function logLogout(userId: string): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.USER_LOGOUT,
        userId,
        severity: 'info',
    });
}

/**
 * Log ride creation
 */
export async function logRideCreated(
    userId: string,
    rideId: string,
    details: Record<string, any>
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.RIDE_CREATED,
        userId,
        rideId,
        details,
        severity: 'info',
    });
}

/**
 * Log user reported (abuse report)
 */
export async function logUserReported(
    reporterUserId: string,
    targetUserId: string,
    reason: string,
    details: Record<string, any>
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.USER_REPORTED,
        userId: reporterUserId,
        targetUserId,
        details: { reason, ...details },
        severity: 'warning',
    });
}

/**
 * Log penalty applied (admin action)
 */
export async function logPenaltyApplied(
    targetUserId: string,
    reason: string,
    strikeCount: number
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.PENALTY_APPLIED,
        userId: 'SYSTEM', // System action
        targetUserId,
        details: { reason, strikeCount },
        severity: 'warning',
    });
}

/**
 * Log user suspension
 */
export async function logUserSuspended(
    targetUserId: string,
    reason: string,
    suspensionDuration: number
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.USER_SUSPENDED,
        userId: 'SYSTEM',
        targetUserId,
        details: { reason, suspensionDuration },
        severity: 'critical',
    });
}

/**
 * Log password change
 */
export async function logPasswordChange(userId: string): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.PASSWORD_CHANGE,
        userId,
        severity: 'warning',
    });
}

/**
 * Log profile update
 */
export async function logProfileUpdate(
    userId: string,
    changedFields: string[]
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.PROFILE_UPDATE,
        userId,
        details: { changedFields },
        severity: 'info',
    });
}

/**
 * Log rating given
 */
export async function logRatingGiven(
    userId: string,
    rideId: string,
    targetUserId: string,
    ratingValue: number
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.RATING_GIVEN,
        userId,
        targetUserId,
        rideId,
        details: { rating: ratingValue },
        severity: 'info',
    });
}

/**
 * Log rate limit hit (potential abuse)
 */
export async function logRateLimitHit(
    userId: string,
    action: string
): Promise<void> {
    await logAuditEvent({
        eventType: AuditEventType.RATE_LIMIT_HIT,
        userId,
        details: { action },
        severity: 'warning',
    });
}
