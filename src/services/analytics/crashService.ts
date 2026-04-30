/**
 * crashService.ts
 * Error reporting via console (Crashlytics not available with JS SDK).
 * Structured so it can be swapped for a real crash reporter later.
 */

export function logError(error: Error, context: object = {}): void {
  console.error('[crashService] Error:', error.message, context);
}

export function logWarning(message: string, context: object = {}): void {
  console.warn('[crashService] Warning:', message, context);
}
