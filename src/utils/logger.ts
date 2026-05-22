/**
 * RideShare AIUB — Logger
 *
 * - info / warn: only emit in __DEV__
 * - error: always emits (production errors must be visible / forwarded to Crashlytics)
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

function format(level: LogLevel, tag: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] [${tag}]`;
}

const logger = {
  debug(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.log(format('DEBUG', tag, args), ...args);
    }
  },

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

    // Placeholder for future crash reporter integration
  },
};

export { logger };
