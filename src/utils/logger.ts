/**
 * RideShare AIUB — Logger
 *
 * - info / warn: only emit in __DEV__
 * - error: always emits (production errors must be visible / forwarded to Crashlytics)
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function format(level: LogLevel, tag: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] [${tag}]`;
}

const logger = {
  info(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.log(format('INFO', tag, args), ...args);
    }
  },

  warn(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.warn(format('WARN', tag, args), ...args);
    }
  },

  error(tag: string, error: unknown, context?: Record<string, unknown>): void {
    // Always log errors — even in production we need the native console
    // (visible in Flipper / Crashlytics in production builds)
    console.error(format('ERROR', tag, [error]), error, context ?? '');

    // Forward to Firebase Crashlytics when available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crashlytics = require('@react-native-firebase/crashlytics').default;
      if (error instanceof Error) {
        crashlytics().recordError(error);
      } else {
        crashlytics().log(`[${tag}] ${String(error)}`);
      }
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlytics().setAttribute(key, String(value));
        });
      }
    } catch {
      // Crashlytics not available — silently ignore
    }
  },
};

export { logger };
