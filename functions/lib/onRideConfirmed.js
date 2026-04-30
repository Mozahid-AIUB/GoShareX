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
exports.onRideConfirmed = void 0;
const functions = __importStar(require("firebase-functions"));
const sendPushNotification_1 = require("./sendPushNotification");
/**
 * Triggered when a ride document is created or its status changes to 'confirmed'.
 * Notifies both riders with a push notification.
 */
exports.onRideConfirmed = functions.firestore
    .document('rides/{rideId}')
    .onWrite(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after)
        return; // ride was deleted
    const statusChanged = (before === null || before === void 0 ? void 0 : before.status) !== after.status;
    const isNowConfirmed = after.status === 'confirmed';
    if (!statusChanged || !isNowConfirmed)
        return;
    const { rider1, rider2, destination, splitAmount } = after;
    const rideId = context.params.rideId;
    const notifyBoth = [
        (0, sendPushNotification_1.notifyUser)(rider1, '🚗 Ride Confirmed!', `Your ride to ${destination} is confirmed. Share: ৳${splitAmount} each.`, { rideId, screen: 'RideConfirmed', destination }),
        (0, sendPushNotification_1.notifyUser)(rider2, '🚗 Ride Confirmed!', `Your ride to ${destination} is confirmed. Share: ৳${splitAmount} each.`, { rideId, screen: 'RideConfirmed', destination }),
    ];
    await Promise.allSettled(notifyBoth);
});
//# sourceMappingURL=onRideConfirmed.js.map