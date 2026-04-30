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
exports.sendPushNotification = sendPushNotification;
exports.notifyUser = notifyUser;
const admin = __importStar(require("firebase-admin"));
/**
 * Send a single FCM push notification.
 * Returns true on success, false if the token is invalid/expired (caller should clean up).
 */
async function sendPushNotification(payload) {
    var _a, _b;
    try {
        await admin.messaging().send({
            token: payload.token,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: (_a = payload.data) !== null && _a !== void 0 ? _a : {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'ride_alerts',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        });
        return true;
    }
    catch (err) {
        const invalidTokenCodes = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
        ];
        if (invalidTokenCodes.includes((_b = err === null || err === void 0 ? void 0 : err.errorInfo) === null || _b === void 0 ? void 0 : _b.code)) {
            return false;
        }
        console.error('sendPushNotification error:', err);
        return false;
    }
}
/**
 * Fetch a user's FCM token from Firestore, send a notification,
 * and remove the token if it has expired.
 */
async function notifyUser(uid, title, body, data) {
    var _a;
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (!userSnap.exists)
        return;
    const fcmToken = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
    if (!fcmToken)
        return;
    const success = await sendPushNotification({ token: fcmToken, title, body, data });
    if (!success) {
        // Token is stale — clear it so we don't attempt again
        await admin.firestore().collection('users').doc(uid).update({ fcmToken: admin.firestore.FieldValue.delete() });
    }
}
//# sourceMappingURL=sendPushNotification.js.map