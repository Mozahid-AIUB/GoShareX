/**
 * crashService.ts
 * Error reporting via logger (Crashlytics not available with JS SDK).
 * Structured so it can be swapped for a real crash reporter later.
 */

import { logger } from '@/utils/logger';

export function logError(error: Error, context: object = {}): void {
  logger.error('crashService', error, context as Record<string, unknown>);
}

export function logWarning(message: string, context: object = {}): void {
  logger.warn('crashService', message, context);
}
