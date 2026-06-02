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
exports.deleteMyAccount = exports.exportMyData = exports.exportAuditLogs = exports.cleanupAuditLogs = exports.logAuditEvent = exports.reverseGeocode = exports.geocode = exports.snapToRoads = exports.distanceMatrix = exports.placesAutocomplete = exports.cleanupOldRateLimits = exports.checkRateLimit = exports.scheduledRatingReminder = exports.rideRatingReminder = exports.processAuditLog = exports.scheduledCleanup = exports.cleanupAnonymousChats = exports.autoExpirePosts = exports.cleanupInactiveRiders = exports.onPenaltyCheck = exports.penaltyCheck = exports.onRideCompleted = exports.onRideComplete = exports.onRideConfirmed = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize once — all other modules share this instance
if (!admin.apps.length) {
    admin.initializeApp();
}
var onRideConfirmed_1 = require("./onRideConfirmed");
Object.defineProperty(exports, "onRideConfirmed", { enumerable: true, get: function () { return onRideConfirmed_1.onRideConfirmed; } });
var onRideComplete_1 = require("./onRideComplete");
Object.defineProperty(exports, "onRideComplete", { enumerable: true, get: function () { return onRideComplete_1.onRideComplete; } });
var onRideCompleted_1 = require("./onRideCompleted");
Object.defineProperty(exports, "onRideCompleted", { enumerable: true, get: function () { return onRideCompleted_1.onRideCompleted; } });
var penaltyCheck_1 = require("./penaltyCheck");
Object.defineProperty(exports, "penaltyCheck", { enumerable: true, get: function () { return penaltyCheck_1.penaltyCheck; } });
var onPenaltyCheck_1 = require("./onPenaltyCheck");
Object.defineProperty(exports, "onPenaltyCheck", { enumerable: true, get: function () { return onPenaltyCheck_1.onPenaltyCheck; } });
var cleanupInactiveRiders_1 = require("./cleanupInactiveRiders");
Object.defineProperty(exports, "cleanupInactiveRiders", { enumerable: true, get: function () { return cleanupInactiveRiders_1.cleanupInactiveRiders; } });
var autoExpirePosts_1 = require("./autoExpirePosts");
Object.defineProperty(exports, "autoExpirePosts", { enumerable: true, get: function () { return autoExpirePosts_1.autoExpirePosts; } });
var cleanupAnonymousChats_1 = require("./cleanupAnonymousChats");
Object.defineProperty(exports, "cleanupAnonymousChats", { enumerable: true, get: function () { return cleanupAnonymousChats_1.cleanupAnonymousChats; } });
var scheduledCleanup_1 = require("./scheduledCleanup");
Object.defineProperty(exports, "scheduledCleanup", { enumerable: true, get: function () { return scheduledCleanup_1.scheduledCleanup; } });
var auditLog_1 = require("./auditLog");
Object.defineProperty(exports, "processAuditLog", { enumerable: true, get: function () { return auditLog_1.processAuditLog; } });
var rideRatingReminder_1 = require("./rideRatingReminder");
Object.defineProperty(exports, "rideRatingReminder", { enumerable: true, get: function () { return rideRatingReminder_1.rideRatingReminder; } });
Object.defineProperty(exports, "scheduledRatingReminder", { enumerable: true, get: function () { return rideRatingReminder_1.scheduledRatingReminder; } });
// SECURITY ENHANCEMENTS
var rateLimiter_1 = require("./rateLimiter");
Object.defineProperty(exports, "checkRateLimit", { enumerable: true, get: function () { return rateLimiter_1.checkRateLimit; } });
Object.defineProperty(exports, "cleanupOldRateLimits", { enumerable: true, get: function () { return rateLimiter_1.cleanupOldRateLimits; } });
var googleMapsProxy_1 = require("./googleMapsProxy");
Object.defineProperty(exports, "placesAutocomplete", { enumerable: true, get: function () { return googleMapsProxy_1.placesAutocomplete; } });
Object.defineProperty(exports, "distanceMatrix", { enumerable: true, get: function () { return googleMapsProxy_1.distanceMatrix; } });
Object.defineProperty(exports, "snapToRoads", { enumerable: true, get: function () { return googleMapsProxy_1.snapToRoads; } });
Object.defineProperty(exports, "geocode", { enumerable: true, get: function () { return googleMapsProxy_1.geocode; } });
Object.defineProperty(exports, "reverseGeocode", { enumerable: true, get: function () { return googleMapsProxy_1.reverseGeocode; } });
var auditLogServer_1 = require("./auditLogServer");
Object.defineProperty(exports, "logAuditEvent", { enumerable: true, get: function () { return auditLogServer_1.logAuditEvent; } });
Object.defineProperty(exports, "cleanupAuditLogs", { enumerable: true, get: function () { return auditLogServer_1.cleanupAuditLogs; } });
Object.defineProperty(exports, "exportAuditLogs", { enumerable: true, get: function () { return auditLogServer_1.exportAuditLogs; } });
var compliance_1 = require("./compliance");
Object.defineProperty(exports, "exportMyData", { enumerable: true, get: function () { return compliance_1.exportMyData; } });
Object.defineProperty(exports, "deleteMyAccount", { enumerable: true, get: function () { return compliance_1.deleteMyAccount; } });
//# sourceMappingURL=index.js.map