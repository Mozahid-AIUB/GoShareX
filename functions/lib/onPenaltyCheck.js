"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPenaltyCheck = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const sendPushNotification_1 = require("./sendPushNotification");
const SUSPENSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STRIKES = 3;
/**
 * Fires when a ride document transitions to 'cancelled'.
 * - Determines who cancelled (via cancelledBy field, fallback rider1)
 * - Increments that user's strike count atomically
 * - Suspends the user for 24 hours when strikes reach MAX_STRIKES
 * - Sends a warning or suspension push notification
 */
exports.onPenaltyCheck = functions.firestore
    .document('rides/{rideId}')
    .onWrite(async (change, _context) => {
    var _a;
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    if ((before === null || before === void 0 ? void 0 : before.status) === after.status)
        return;
    if (after.status !== 'cancelled')
        return;
    const cancelledBy = (_a = after.cancelledBy) !== null && _a !== void 0 ? _a : after.rider1;
    if (!cancelledBy)
        return;
    const userRef = admin.firestore().collection('users').doc(cancelledBy);
    await admin.firestore().runTransaction(async (tx) => {
        var _a;
        const snap = await tx.get(userRef);
        if (!snap.exists)
            return;
        const data = snap.data();
        const strikes = ((_a = data.strikes) !== null && _a !== void 0 ? _a : 0) + 1;
        if (strikes >= MAX_STRIKES) {
            const suspendedUntil = Date.now() + SUSPENSION_DURATION_MS;
            tx.update(userRef, {
                strikes,
                isSuspended: true,
                suspendedUntil,
                suspensionReason: `Suspended after ${strikes} ride cancellations.`,
            });
            (0, sendPushNotification_1.notifyUser)(cancelledBy, '⚠️ Account Suspended', `Your account has been suspended for 24 hours after ${strikes} ride cancellations.`, { screen: 'Suspension' }).catch(() => { });
        }
        else {
            tx.update(userRef, { strikes });
            const remaining = MAX_STRIKES - strikes;
            (0, sendPushNotification_1.notifyUser)(cancelledBy, '⚠️ Cancellation Warning', `You have ${strikes} cancellation strike${strikes > 1 ? 's' : ''}. ${remaining} more will result in a 24-hour suspension.`, { screen: 'Home' }).catch(() => { });
        }
    });
});
//# sourceMappingURL=onPenaltyCheck.js.map