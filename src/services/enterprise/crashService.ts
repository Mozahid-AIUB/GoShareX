/**
 * crashService.ts — Production-grade error tracking & reporting
 * 
 * Features:
 * - Captures unhandled exceptions
 * - Logs to Firebase & local storage
 * - Sends error telemetry to backend
 * - User-friendly error messages
 * - Do not expose sensitive data in errors
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const ERROR_LOG_KEY = 'gosharex_error_logs_v1';
const MAX_LOCAL_LOGS = 50;

export interface ErrorReport {
    id?: string;
    userId?: string;
    message: string;
    stack: string;
    context: string; // e.g., 'ChatScreen', 'LoginScreen'
    severity: 'info' | 'warning' | 'error' | 'critical';
    code?: string; // e.g., 'AUTH_001', 'NETWORK_001'
    metadata?: Record<string, any>;
    timestamp: number;
    version: string;
    platform: 'ios' | 'android';
}

export class ErrorService {
    private static instance: ErrorService;

    private constructor() { }

    static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    /**
     * Capture an error with context
     */
    async captureError(
        error: Error | string,
        context: string,
        metadata?: Record<string, any>,
        severity: ErrorReport['severity'] = 'error',
        code?: string
    ): Promise<void> {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack ?? '' : '';

        const report: ErrorReport = {
            message,
            stack,
            context,
            severity,
            code,
            metadata,
            timestamp: Date.now(),
            version: '1.0.0', // from package.json
            platform: 'android', // detect from env
        };

        // Log locally
        await this.logLocally(report);

        // Send to Firebase if severity >= error
        if (severity === 'error' || severity === 'critical') {
            void this.sendToFirebase(report);
        }

        // Log to console in dev
        logger.error(context, message, { stack, ...metadata });
    }

    /**
     * Store error logs locally (for offline scenarios)
     */
    private async logLocally(report: ErrorReport): Promise<void> {
        try {
            const existing = await AsyncStorage.getItem(ERROR_LOG_KEY);
            const logs: ErrorReport[] = existing ? JSON.parse(existing) : [];
            logs.push(report);
            // Keep only recent logs
            const trimmed = logs.slice(-MAX_LOCAL_LOGS);
            await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
        } catch (e) {
            logger.warn('ErrorService.local', e);
        }
    }

    /**
     * Send error report to Firebase for analysis
     */
    private async sendToFirebase(report: ErrorReport): Promise<void> {
        try {
            await addDoc(collection(db, 'error_reports'), {
                ...report,
                createdAt: serverTimestamp(),
            });
        } catch (e) {
            logger.warn('ErrorService.firebase', e);
        }
    }

    /**
     * Get user-friendly error message (never expose sensitive details)
     */
    static getUserMessage(error: Error | string, fallback = 'Something went wrong'): string {
        const msg = error instanceof Error ? error.message : String(error);

        // Map known errors to friendly messages
        const errorMap: Record<string, string> = {
            'PERMISSION_DENIED': 'You don\'t have permission to perform this action.',
            'NETWORK_ERROR': 'Network error. Please check your connection.',
            'AUTH_ERROR': 'Authentication failed. Please log in again.',
            'USER_SUSPENDED': 'Your account has been suspended.',
            'INVALID_EMAIL': 'Please enter a valid email address.',
            'WEAK_PASSWORD': 'Password must be at least 6 characters.',
            'EMAIL_ALREADY_IN_USE': 'This email is already registered.',
            'TOO_MANY_REQUESTS': 'Too many attempts. Please try again later.',
            'INVALID_INPUT': 'Please check your input and try again.',
        };

        for (const [key, friendlyMsg] of Object.entries(errorMap)) {
            if (msg.includes(key)) return friendlyMsg;
        }

        return fallback;
    }

    /**
     * Get local error logs (for debugging/support)
     */
    async getLocalLogs(): Promise<ErrorReport[]> {
        try {
            const data = await AsyncStorage.getItem(ERROR_LOG_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Clear local error logs
     */
    async clearLocalLogs(): Promise<void> {
        await AsyncStorage.removeItem(ERROR_LOG_KEY);
    }
}

export const errorService = ErrorService.getInstance();

type UnhandledRejectionHandler = (event: { reason?: unknown }) => void;
type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
    getGlobalHandler?: () => GlobalErrorHandler | undefined;
    setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

type CrashServiceGlobal = typeof globalThis & {
    onunhandledrejection?: UnhandledRejectionHandler;
    ErrorUtils?: ErrorUtilsLike;
};

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandlers(): void {
    const runtimeGlobal = globalThis as CrashServiceGlobal;

    // Unhandled promise rejections
    if (runtimeGlobal.onunhandledrejection) {
        runtimeGlobal.onunhandledrejection = ({ reason }: { reason?: unknown }) => {
            void errorService.captureError(
                reason instanceof Error ? reason : String(reason ?? 'Unknown promise rejection'),
                'GlobalHandler',
                undefined,
                'critical',
                'UNHANDLED_PROMISE_REJECTION'
            );
        };
    }

    // Unhandled errors (React Native)
    if (runtimeGlobal.ErrorUtils) {
        const originalHandler = runtimeGlobal.ErrorUtils.getGlobalHandler?.();
        runtimeGlobal.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
            void errorService.captureError(
                error instanceof Error ? error : String(error),
                'GlobalHandler',
                { isFatal },
                isFatal ? 'critical' : 'error',
                'UNHANDLED_ERROR'
            );

            // Call original handler
            if (originalHandler) {
                originalHandler(error, isFatal);
            }
        });
    }
}

/**
 * Log message with error context
 */
export function logError(
    error: Error | string,
    context: string,
    metadata?: Record<string, any>
): Promise<void> {
    return errorService.captureError(error, context, metadata, 'error');
}

/**
 * Log warning
 */
export function logWarning(
    message: string,
    context: string,
    metadata?: Record<string, any>
): Promise<void> {
    return errorService.captureError(message, context, metadata, 'warning');
}

/**
 * Log critical issue
 */
export function logCritical(
    error: Error | string,
    context: string,
    metadata?: Record<string, any>
): Promise<void> {
    return errorService.captureError(error, context, metadata, 'critical', 'CRITICAL_ISSUE');
}
