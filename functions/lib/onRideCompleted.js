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
exports.onRideCompleted = void 0;
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
        var _a, _b, _c;
        const snap = await tx.get(userRef);
        if (!snap.exists)
            return;
        const data = snap.data();
        const totalRides = ((_a = data.totalRides) !== null && _a !== void 0 ? _a : 0) + 1;
        const totalSaved = ((_b = data.totalSaved) !== null && _b !== void 0 ? _b : 0) + splitAmount;
        const badge = badgeForRides(totalRides);
        // Every 5 completed rides, reduce 1 strike (good behaviour reward)
        const currentStrikes = (_c = data.strikes) !== null && _c !== void 0 ? _c : 0;
        const strikes = totalRides % 5 === 0 && currentStrikes > 0
            ? Math.max(0, currentStrikes - 1)
            : currentStrikes;
        tx.update(userRef, { totalRides, totalSaved, badge, strikes });
    });
}
/**
 * Fires when a ride document transitions to 'completed'.
 * - Updates totalRides, totalSaved, badge for both riders
 * - Reduces a strike every 5 completed rides (good-behaviour reward)
 * - Sends completion push notification to both riders
 */
exports.onRideCompleted = functions.firestore
    .document('rides/{rideId}')
    .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return;
    if ((before === null || before === void 0 ? void 0 : before.status) === after.status)
        return;
    if (after.status !== 'completed')
        return;
    const { rider1, rider2, destination, splitAmount } = after;
    const rideId = context.params.rideId;
    await Promise.allSettled([
        updateRiderStats(rider1, splitAmount),
        updateRiderStats(rider2, splitAmount),
    ]);
    await Promise.allSettled([
        (0, sendPushNotification_1.notifyUser)(rider1, '✅ Ride Completed', `You arrived at ${destination}. Rate your ride partner!`, { rideId, screen: 'RideComplete', destination }),
        (0, sendPushNotification_1.notifyUser)(rider2, '✅ Ride Completed', `You arrived at ${destination}. Rate your ride partner!`, { rideId, screen: 'RideComplete', destination }),
    ]);
});
//# sourceMappingURL=onRideCompleted.js.map