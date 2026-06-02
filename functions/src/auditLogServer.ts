/**
 * SERVER-SIDE AUDIT LOGGING
 * Processes and stores audit events for compliance, monitoring, and investigations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface AuditLogData {
    eventType: string;
    userId: string;
    targetUserId?: string;
    rideId?: string;
    chatId?: string;
    details?: Record<string, any>;
    userAgent?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Cloud Function to log audit events
 * Called from client and from other server functions
 */
export const logAuditEvent = functions.https.onCall(async (data: AuditLogData, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const db = admin.firestore();
    const {
        eventType,
        userId,
        targetUserId,
        rideId,
        chatId,
        details = {},
        userAgent = '',
        severity = 'info',
    } = data;

    // Validate required fields
    if (!eventType || typeof eventType !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid eventType');
    }

    if (!userId || typeof userId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid userId');
    }

    try {
        // Record audit log
        const logRef = db.collection('audit_logs').doc();
        await logRef.set(
            {
                eventType,
                userId,
                targetUserId: targetUserId || null,
                rideId: rideId || null,
                chatId: chatId || null,
                details: sanitizeDetails(details),
                userAgent: userAgent.substring(0, 200),
                severity,
                timestamp: admin.firestore.Timestamp.now(),
                timestampUnix: Math.floor(Date.now() / 1000),
            },
            { merge: true }
        );

        // Handle critical security events
        if (severity === 'critical') {
            await handleCriticalEvent(eventType, userId, targetUserId);
        }

        // Handle warning-level events (potential abuse)
        if (severity === 'warning' && eventType === 'rate_limit_hit') {
            await trackPotentialAbuse(userId, eventType);
        }

        functions.logger.info(`Audit logged: ${eventType}`, { userId, severity });
        return { success: true };
    } catch (error) {
        functions.logger.error('Failed to log audit event:', error);
        // Don't throw — audit logging failure shouldn't break the operation
        return { success: false, error: String(error) };
    }
});

/**
 * Handle critical security events
 * (suspension, account deletion, etc)
 */
async function handleCriticalEvent(
    eventType: string,
    userId: string,
    targetUserId?: string
): Promise<void> {
    const db = admin.firestore();

    if (eventType === 'user_suspended') {
        // Invalidate all active sessions
        const activeSessions = db.collection('active_sessions').where('userId', '==', targetUserId);
        const docs = await activeSessions.get();
        const batch = db.batch();
        docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        if (docs.size > 0) {
            await batch.commit();
        }

        functions.logger.warn(`User suspended: ${targetUserId}`);
    }

    if (eventType === 'account_delete') {
        // Schedule data cleanup
        await db.collection('scheduled_tasks').add({
            taskType: 'cleanup_user_data',
            userId: targetUserId || userId,
            scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        });
    }
}

/**
 * Track potential abuse (multiple rate limit hits, etc)
 */
async function trackPotentialAbuse(userId: string, eventType: string): Promise<void> {
    const db = admin.firestore();
    const abuseRef = db.collection('abuse_tracking').doc(userId);

    await db.runTransaction(async (tx) => {
        const abuseDoc = await tx.get(abuseRef);
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesAgo = now - 300;

        let abuseRecord = abuseDoc.data() ?? { events: [] };

        // Clean old events (older than 1 hour)
        abuseRecord.events = (abuseRecord.events || []).filter((e: any) => e.timestamp > now - 3600);

        // Add new event
        abuseRecord.events.push({
            eventType,
            timestamp: now,
        });

        // Check for patterns
        const recentEvents = abuseRecord.events.filter((e: any) => e.timestamp > fiveMinutesAgo);

        if (recentEvents.length >= 5) {
            // 5+ rate limit hits in 5 minutes = potential abuse
            functions.logger.warn(`Potential abuse detected: ${userId}`, {
                recentEvents: recentEvents.length,
            });

            // Flag for admin review
            await tx.set(
                db.collection('abuse_alerts').doc(),
                {
                    userId,
                    severity: 'medium',
                    reason: 'Multiple rate limit violations',
                    events: recentEvents,
                    createdAt: admin.firestore.Timestamp.now(),
                }
            );
        }

        tx.set(abuseRef, abuseRecord);
    });
}

/**
 * Sanitize details to prevent logging sensitive data
 */
function sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credit'];

    for (const [key, value] of Object.entries(details)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
            // Truncate long strings
            sanitized[key] = value.substring(0, 500);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Cleanup old audit logs (retention policy: 1 year)
 */
export const cleanupAuditLogs = functions.pubsub
    .schedule('0 3 1 * *') // 3 AM on 1st of each month
    .onRun(async () => {
        const db = admin.firestore();
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

        const query = db.collection('audit_logs').where('timestamp', '<', oneYearAgo);
        const docs = await query.get();

        functions.logger.info(`Archiving ${docs.size} audit logs older than 1 year`);

        const batch = db.batch();
        docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        if (docs.size > 0) {
            await batch.commit();
        }
    });

/**
 * Export audit logs for compliance (GDPR, etc)
 */
export const exportAuditLogs = functions.https.onCall(async (data: { userId: string }, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const db = admin.firestore();
    const { userId } = data;

    // Users can only export their own logs
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot export other user logs');
    }

    try {
        const query = db.collection('audit_logs').where('userId', '==', userId);
        const docs = await query.get();

        const logs = docs.docs.map((doc) => ({
            ...doc.data(),
            timestamp: (doc.data().timestamp as any)?.toDate?.()?.toISOString?.() || doc.data().timestamp,
        }));

        return {
            userId,
            exportedAt: new Date().toISOString(),
            logsCount: logs.length,
            logs,
        };
    } catch (error) {
        functions.logger.error('Failed to export audit logs:', error);
        throw new functions.https.HttpsError('internal', 'Failed to export logs');
    }
});
