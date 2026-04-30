/**
 * Audit Log Processor Cloud Function
 * Triggered when a client logs an audit event
 * Enriches logs with server-side context (IP, timestamp, etc)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Process audit logs from clients
 * Validates, enriches, and stores in a secure collection
 */
export const processAuditLog = functions.firestore
    .document('audit_logs/{logId}')
    .onCreate(async (snap) => {
        try {
            const data = snap.data();
            const { userId, action, resource, resourceId, changes, status, errorMessage, clientTimestamp } = data;

            // Validation
            if (!userId || !action || !resource || !resourceId) {
                console.warn('Invalid audit log format', data);
                return;
            }

            // Enrich with server context
            const enrichedLog = {
                ...data,
                // Server timestamp (more reliable than client)
                serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                // Server-side additions (for future use)
                region: process.env.FUNCTION_REGION || 'us-central1',
                version: '1.0',
            };

            // Store in permanent audit collection (read-only for non-admins)
            await admin.firestore().collection('audit_logs_processed').doc(snap.id).set(enrichedLog);

            // Log specific actions for business intelligence
            switch (action) {
                case 'CREATE_RATING':
                    await logRatingMetric(userId, resourceId, changes);
                    break;
                case 'COMPLETE_RIDE':
                    await logRideCompletionMetric(userId, resourceId, changes);
                    break;
                case 'ADD_STRIKE':
                    await logPenaltyMetric(userId, changes);
                    break;
                case 'SUSPEND_USER':
                    await logSuspensionMetric(userId, changes);
                    break;
            }

            console.info(`Audit logged: ${action} by ${userId} on ${resource}/${resourceId}`);
        } catch (error) {
            console.error('Error processing audit log:', error);
            // Don't throw — don't want to retry failed audit logs
        }
    });

/**
 * Log rating event for analytics
 */
async function logRatingMetric(userId: string, rideId: string, changes: any): Promise<void> {
    try {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        await admin.firestore().collection('metrics').doc(`ratings_${yearMonth}`).update({
            totalRatings: admin.firestore.FieldValue.increment(1),
            avgStars: admin.firestore.FieldValue.increment(changes?.stars || 0),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(async () => {
            // Create if doesn't exist
            await admin.firestore().collection('metrics').doc(`ratings_${yearMonth}`).set({
                totalRatings: 1,
                avgStars: changes?.stars || 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.warn('Error logging rating metric:', error);
    }
}

/**
 * Log ride completion for business analytics
 */
async function logRideCompletionMetric(userId: string, rideId: string, changes: any): Promise<void> {
    try {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        await admin.firestore().collection('metrics').doc(`rides_daily_${date}`).update({
            totalCompleted: admin.firestore.FieldValue.increment(1),
            totalFare: admin.firestore.FieldValue.increment(changes?.fare || 0),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(async () => {
            // Create if doesn't exist
            await admin.firestore().collection('metrics').doc(`rides_daily_${date}`).set({
                totalCompleted: 1,
                totalFare: changes?.fare || 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.warn('Error logging ride completion metric:', error);
    }
}

/**
 * Log penalty/strike for compliance
 */
async function logPenaltyMetric(userId: string, changes: any): Promise<void> {
    try {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        await admin.firestore().collection('metrics').doc(`penalties_${yearMonth}`).update({
            totalStrikes: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(async () => {
            // Create if doesn't exist
            await admin.firestore().collection('metrics').doc(`penalties_${yearMonth}`).set({
                totalStrikes: 1,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.warn('Error logging penalty metric:', error);
    }
}

/**
 * Log user suspension for compliance
 */
async function logSuspensionMetric(userId: string, changes: any): Promise<void> {
    try {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        await admin.firestore().collection('metrics').doc(`suspensions_${date}`).update({
            totalSuspended: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(async () => {
            // Create if doesn't exist
            await admin.firestore().collection('metrics').doc(`suspensions_${date}`).set({
                totalSuspended: 1,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    } catch (error) {
        console.warn('Error logging suspension metric:', error);
    }
}
