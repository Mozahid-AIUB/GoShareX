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
exports.onRideComplete = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const sendPushNotification_1 = require("./sendPushNotification");
const BADGE_THRESHOLDS = [
    { min: 50, badge: 'Elite Rider' },
    { min: 21, badge: 'Trusted Rider' },
    { min: 6, badge: 'Regular Rider' },
    { min: 0, badge: 'New Rider' },
];
function badgeForRides(totalRides) {
    var _a, _b;
    return (_b = (_a = BADGE_THRESHOLDS.find((t) => totalRides >= t.min)) === null || _a === void 0 ? void 0 : _a.badge) !== null && _b !== void 0 ? _b : 'New Rider';
}
async function updateRiderStats(uid, splitAmount) {
    const userRef = admin.firestore().collection('users').doc(uid);
    await admin.firestore().runTransaction(async (tx) => {
        var _a, _b;
        const snap = await tx.get(userRef);
        if (!snap.exists)
            return;
        const data = snap.data();
        const totalRides = ((_a = data.totalRides) !== null && _a !== void 0 ? _a : 0) + 1;
        const totalSaved = ((_b = data.totalSaved) !== null && _b !== void 0 ? _b : 0) + splitAmount;
        const badge = badgeForRides(totalRides);
        tx.update(userRef, { totalRides, totalSaved, badge });
    });
}
/**
 * Triggered when a ride status changes to 'completed'.
 * Updates both riders' stats (totalRides, totalSaved, badge) and sends notifications.
 */
exports.onRideComplete = functions.firestore
    .document('rides/{rideId}')
    .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    const statusChanged = (before === null || before === void 0 ? void 0 : before.status) !== after.status;
    const isNowComplete = after.status === 'completed';
    if (!statusChanged || !isNowComplete)
        return;
    const { rider1, rider2, destination, splitAmount } = after;
    // Update stats for both riders concurrently — each inside its own transaction
    await Promise.allSettled([
        updateRiderStats(rider1, splitAmount),
        updateRiderStats(rider2, splitAmount),
    ]);
    // Send completion notifications
    await Promise.allSettled([
        (0, sendPushNotification_1.notifyUser)(rider1, '✅ Ride Completed', `You arrived at ${destination}. Rate your ride partner!`, { screen: 'RideComplete', destination }),
        (0, sendPushNotification_1.notifyUser)(rider2, '✅ Ride Completed', `You arrived at ${destination}. Rate your ride partner!`, { screen: 'RideComplete', destination }),
    ]);
});
//# sourceMappingURL=onRideComplete.js.map