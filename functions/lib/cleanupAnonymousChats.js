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
exports.cleanupAnonymousChats = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const app = admin.apps.length ? admin.app() : admin.initializeApp();
const db = app.firestore();
exports.cleanupAnonymousChats = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async () => {
    const now = Date.now();
    const expiredChats = await db
        .collection('chats')
        .where('anonymous', '==', true)
        .where('expiresAt', '<=', now)
        .get();
    let deletedChats = 0;
    let deletedMessages = 0;
    for (const chatDoc of expiredChats.docs) {
        const messages = await chatDoc.ref.collection('messages').get();
        let batch = db.batch();
        let ops = 0;
        for (const messageDoc of messages.docs) {
            batch.delete(messageDoc.ref);
            deletedMessages += 1;
            ops += 1;
            if (ops === 400) {
                await batch.commit();
                batch = db.batch();
                ops = 0;
            }
        }
        batch.delete(chatDoc.ref);
        deletedChats += 1;
        await batch.commit();
    }
    console.log(`Deleted ${deletedChats} expired anonymous chats and ${deletedMessages} messages`);
    return null;
});
//# sourceMappingURL=cleanupAnonymousChats.js.map