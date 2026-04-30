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
exports.cleanupAnonymousChats = exports.penaltyCheck = exports.autoExpirePosts = exports.cleanupInactiveRiders = exports.onRideComplete = exports.onRideConfirmed = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize once — all other modules share this instance
if (!admin.apps.length) {
    admin.initializeApp();
}
var onRideConfirmed_1 = require("./onRideConfirmed");
Object.defineProperty(exports, "onRideConfirmed", { enumerable: true, get: function () { return onRideConfirmed_1.onRideConfirmed; } });
var onRideComplete_1 = require("./onRideComplete");
Object.defineProperty(exports, "onRideComplete", { enumerable: true, get: function () { return onRideComplete_1.onRideComplete; } });
var cleanupInactiveRiders_1 = require("./cleanupInactiveRiders");
Object.defineProperty(exports, "cleanupInactiveRiders", { enumerable: true, get: function () { return cleanupInactiveRiders_1.cleanupInactiveRiders; } });
var autoExpirePosts_1 = require("./autoExpirePosts");
Object.defineProperty(exports, "autoExpirePosts", { enumerable: true, get: function () { return autoExpirePosts_1.autoExpirePosts; } });
var penaltyCheck_1 = require("./penaltyCheck");
Object.defineProperty(exports, "penaltyCheck", { enumerable: true, get: function () { return penaltyCheck_1.penaltyCheck; } });
var cleanupAnonymousChats_1 = require("./cleanupAnonymousChats");
Object.defineProperty(exports, "cleanupAnonymousChats", { enumerable: true, get: function () { return cleanupAnonymousChats_1.cleanupAnonymousChats; } });
//# sourceMappingURL=index.js.map