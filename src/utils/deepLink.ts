/**
 * RideShare AIUB — Deep Link Parser
 *
 * Supported schemes:
 *   rideshare://chat/:chatId
 *   rideshare://ride/:rideId
 *   rideshare://profile/:userId
 *   rideshare://post/:postId
 */
import { ROUTES } from '@/constants/routes';
import { logger } from './logger';

export interface ParsedDeepLink {
  screen: string;
  params: Record<string, string>;
}

type RoutePattern = {
  pattern: RegExp;
  screen: string;
  paramNames: string[];
};

const ROUTE_PATTERNS: RoutePattern[] = [
  {
    // rideshare://chat/abc123
    pattern: /^rideshare:\/\/chat\/([^/]+)$/,
    screen: ROUTES.CHAT,
    paramNames: ['chatId'],
  },
  {
    // rideshare://ride/xyz789
    pattern: /^rideshare:\/\/ride\/([^/]+)$/,
    screen: ROUTES.RIDE_ACTIVE,
    paramNames: ['rideId'],
  },
  {
    // rideshare://profile/uid456
    pattern: /^rideshare:\/\/profile\/([^/]+)$/,
    screen: ROUTES.PROFILE,
    paramNames: ['userId'],
  },
  {
    // rideshare://post/postId
    pattern: /^rideshare:\/\/post\/([^/]+)$/,
    screen: ROUTES.POST_BOARD,
    paramNames: ['postId'],
  },
  {
    // rideshare://home
    pattern: /^rideshare:\/\/home$/,
    screen: ROUTES.HOME,
    paramNames: [],
  },
];

/**
 * Parse a deep-link URL into a screen name and params object.
 * Returns null for unrecognised URLs.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;

  for (const { pattern, screen, paramNames } of ROUTE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1] ?? '');
      });
      logger.info('deepLink.parse', `Matched screen=${screen}`, params);
      return { screen, params };
    }
  }

  logger.warn('deepLink.parse', `No match for URL: ${url}`);
  return null;
}
