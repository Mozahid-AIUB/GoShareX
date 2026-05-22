/**
 * src/services/enterprise/index.ts — Central export for enterprise services
 */

export { errorService, ErrorService, setupGlobalErrorHandlers, logError, logWarning, logCritical } from './crashService';
export type { ErrorReport } from './crashService';

export { analyticsService, Events } from './analyticsService';
export type { AnalyticsEvent, PerformanceMetric } from './analyticsService';

export { rateLimitService, RateLimited, checkRateLimit } from './rateLimitService';
export type { RateLimitConfig } from './rateLimitService';

export { performanceService, MeasureScreen, useScreenPerformance, measureAsync } from './performanceService';

// Validation utilities
export {
    isValidEmail,
    isValidAIUBEmail,
    isStrongPassword,
    isValidPhoneNumber,
    isValidStudentId,
    sanitizeText,
    sanitizeUrl,
    isValidDestination,
    isValidFare,
    isValidRating,
    isValidCoordinates,
    isValidName,
    validate,
    validateBatch,
    ValidationPresets,
} from '@/utils/validation';
export type { ValidationRule } from '@/utils/validation';

// Enterprise configuration
export { default as enterpriseConfig } from '@/config/enterprise.config';
