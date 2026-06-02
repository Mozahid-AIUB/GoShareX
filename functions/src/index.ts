import * as admin from 'firebase-admin';

// Initialize once — all other modules share this instance
if (!admin.apps.length) {
  admin.initializeApp();
}

export { onRideConfirmed } from './onRideConfirmed';
export { onRideComplete } from './onRideComplete';
export { onRideCompleted } from './onRideCompleted';
export { penaltyCheck } from './penaltyCheck';
export { onPenaltyCheck } from './onPenaltyCheck';
export { cleanupInactiveRiders } from './cleanupInactiveRiders';
export { autoExpirePosts } from './autoExpirePosts';
export { cleanupAnonymousChats } from './cleanupAnonymousChats';
export { scheduledCleanup } from './scheduledCleanup';
export { processAuditLog } from './auditLog';
export { rideRatingReminder, scheduledRatingReminder } from './rideRatingReminder';

// SECURITY ENHANCEMENTS
export { checkRateLimit, cleanupOldRateLimits } from './rateLimiter';
export { placesAutocomplete, distanceMatrix, snapToRoads, geocode, reverseGeocode } from './googleMapsProxy';
export { logAuditEvent, cleanupAuditLogs, exportAuditLogs } from './auditLogServer';
export { exportMyData, deleteMyAccount } from './compliance';
