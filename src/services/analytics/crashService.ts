/**
 * crashService.ts
 * Crash and error reporting via Firebase Crashlytics.
 * Falls back to console output when Crashlytics is unavailable (e.g. Expo Go).
 */

let _crashlytics: any = null;

async function getCrashlytics() {
  if (!_crashlytics) {
    try {
      const mod = await import('@react-native-firebase/crashlytics');
      _crashlytics = mod.default();
    } catch {
      _crashlytics = null;
    }
  }
  return _crashlytics;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a caught error with optional context metadata.
 * Logs to Crashlytics in production and to the console in __DEV__ mode.
 *
 * @param error    The Error object to record
 * @param context  Arbitrary key-value context (will be logged as custom keys)
 */
export function logError(error: Error, context: object = {}): void {
  if (__DEV__) {
    console.error('[crashService] Error:', error.message, context);
  }

  getCrashlytics()
    .then(async (crashlytics: any) => {
      if (!crashlytics) return;
      for (const [key, value] of Object.entries(context)) {
        await crashlytics.setAttribute(key, String(value));
      }
      await crashlytics.recordError(error);
    })
    .catch((err: unknown) =>
      console.warn('[crashService] Failed to record error:', err),
    );
}

/**
 * Log a non-fatal warning message with optional context.
 *
 * @param message  Human-readable warning description
 * @param context  Arbitrary key-value context
 */
export function logWarning(message: string, context: object = {}): void {
  if (__DEV__) {
    console.warn('[crashService] Warning:', message, context);
  }

  getCrashlytics()
    .then(async (crashlytics: any) => {
      if (!crashlytics) return;
      for (const [key, value] of Object.entries(context)) {
        await crashlytics.setAttribute(key, String(value));
      }
      await crashlytics.log(`WARNING: ${message}`);
    })
    .catch((err: unknown) =>
      console.warn('[crashService] Failed to log warning:', err),
    );
}
