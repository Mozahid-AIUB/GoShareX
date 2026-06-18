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

function maskValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (value.length > 8) {
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }
  return value;
}

function sanitizeLogArg(arg: unknown): unknown {
  if (Array.isArray(arg)) return arg.map(sanitizeLogArg);
  if (!arg || typeof arg !== 'object') return maskValue(arg);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(arg as Record<string, unknown>)) {
    const lowered = key.toLowerCase();
    if (['password', 'token', 'access_token', 'refresh_token', 'secret', 'apiKey', 'apikey'].some((k) => lowered.includes(k.toLowerCase()))) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = sanitizeLogArg(value);
    }
  }
  return out;
}

const logger = {
  debug(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.log(format('DEBUG', tag, args), ...args.map(sanitizeLogArg));
    }
  },

  info(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.log(format('INFO', tag, args), ...args.map(sanitizeLogArg));
    }
  },

  warn(tag: string, ...args: unknown[]): void {
    if (__DEV__) {
      console.warn(format('WARN', tag, args), ...args.map(sanitizeLogArg));
    }
  },

  error(tag: string, error: unknown, context?: Record<string, unknown>): void {
    // Always log errors — even in production we need the native console
    // (visible in Flipper / Crashlytics in production builds)
    console.error(format('ERROR', tag, [error]), sanitizeLogArg(error), sanitizeLogArg(context ?? ''));

    // Crash reporter hook — Sentry/Crashlytics যোগ করলে এখানে forward হবে।
    // setCrashReporter() দিয়ে রিপোর্টার সেট করা থাকলে (sanitized) error পাঠাই।
    // এখন কিছু install করা নেই → no-op (নিরাপদ)। পরে শুধু reporter সেট করলেই চলবে।
    if (crashReporter) {
      try {
        crashReporter(error, { tag, ...(context ?? {}) });
      } catch {
        /* reporter নিজে fail করলে app crash করাব না */
      }
    }
  },
};

// ── Crash reporter integration point (Sentry/Crashlytics-ready) ──
// production-এ: app boot-এ Sentry.init(...) করে
//   setCrashReporter((e, ctx) => Sentry.captureException(e, { extra: ctx }))
// কল করলেই logger.error সব Sentry-তে পাঠাবে। কোনো install এখন লাগে না।
type CrashReporter = (error: unknown, context?: Record<string, unknown>) => void;
let crashReporter: CrashReporter | null = null;
export function setCrashReporter(reporter: CrashReporter | null): void {
  crashReporter = reporter;
}

export { logger };
