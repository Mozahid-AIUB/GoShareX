/**
 * shareRideService.ts — Build shareable ride context for WhatsApp/SMS.
 *
 * Two modes:
 *
 * 1) **Client-only (MVP — current implementation)**
 *    Generates a Maps deep-link with the current rider coords +
 *    destination. Recipient sees a Google Maps view of the route. No
 *    live updates — snapshot only.
 *
 * 2) **Server-signed live tracking (future, requires Cloud Function)**
 *    `generateShareLink` Cloud Function creates a JWT token, stores
 *    {rideId, exp} in Firestore `share_tokens/{token}`, returns a URL
 *    like `https://gosharex.app/track/{token}`. A static web page
 *    embeds Maps JavaScript / Embed API and polls RTDB for live coords.
 *    Token expires when ride completes.
 *
 * For now, this service implements mode 1 + plain-text message builder.
 */

import { Share } from 'react-native';
import { logger } from '@/utils/logger';
import { trackEvent } from '@/services/analytics/analyticsService';

export type ShareRideInput = {
  riderName: string;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  currentLat?: number;
  currentLng?: number;
  etaMinutes?: number;
  rideId?: string;
};

/**
 * Build a Google Maps deep-link to the destination, optionally with
 * directions from the rider's current location.
 */
export function buildMapLink(input: ShareRideInput): string {
  const dest = `${input.destinationLat},${input.destinationLng}`;
  if (input.currentLat != null && input.currentLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${input.currentLat},${input.currentLng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${dest}`;
}

/**
 * Build a friendly text message including the link.
 */
export function buildShareMessage(input: ShareRideInput): string {
  const link = buildMapLink(input);
  const eta = input.etaMinutes != null ? ` (ETA ~${input.etaMinutes} min)` : '';
  return [
    `${input.riderName} is on the way to ${input.destinationName}${eta}.`,
    '',
    `Track via Google Maps:`,
    link,
    '',
    `— Shared from GoShareX`,
  ].join('\n');
}

/**
 * Open the native share sheet (WhatsApp, SMS, Messages, etc.).
 * Fire-and-forget; resolves to true if the user shared.
 */
export async function shareRide(input: ShareRideInput): Promise<boolean> {
  try {
    const message = buildShareMessage(input);
    const result = await Share.share({
      message,
      title: `Live ride to ${input.destinationName}`,
    });

    const shared = result.action === Share.sharedAction;
    trackEvent('ride_shared', {
      ride_id: input.rideId ?? 'unknown',
      destination: input.destinationName,
      with_location: input.currentLat != null,
    });
    return shared;
  } catch (err) {
    logger.warn('shareRideService.shareRide', err);
    return false;
  }
}
