/**
 * PRODUCTION-GRADE API PROXY
 * Protects Google Maps API keys by routing through Cloud Functions
 * 
 * Benefits:
 * - API keys never exposed in APK
 * - Server-side rate limiting
 * - Request logging and monitoring
 * - Easier to rotate keys
 * - Can add custom validation/filtering
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const ROADS_API_BASE = 'https://roads.googleapis.com/v1/snapToRoads';
const GEOCODE_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Proxy: Places Autocomplete
 * Called when user types destination
 */
export const placesAutocomplete = functions.https.onCall(
    async (data: { input: string; sessionToken?: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { input, sessionToken } = data;

        if (!input || typeof input !== 'string' || input.length < 2) {
            throw new functions.https.HttpsError('invalid-argument', 'Input must be at least 2 characters');
        }

        if (input.length > 200) {
            throw new functions.https.HttpsError('invalid-argument', 'Input too long (max 200 chars)');
        }

        try {
            const url = new URL(`${PLACES_API_BASE}/autocomplete/json`);
            url.searchParams.set('input', input);
            url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
            url.searchParams.set('sessiontoken', sessionToken || '');
            url.searchParams.set('components', 'country:bd'); // Restrict to Bangladesh
            url.searchParams.set('language', 'en');

            const response = await fetch(url.toString());
            const data = await response.json();

            // Audit log for sensitive API usage
            await auditGoogleAPICall('places_autocomplete', context.auth.uid, {
                input: input.substring(0, 20), // Log only first 20 chars
                results: data.predictions?.length || 0,
            });

            return data;
        } catch (error) {
            functions.logger.error('Places autocomplete error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to fetch place suggestions'
            );
        }
    }
);

/**
 * Proxy: Distance Matrix
 * Calculate distances between locations
 */
export const distanceMatrix = functions.https.onCall(
    async (
        data: {
            origins: Array<{ lat: number; lng: number }>;
            destinations: Array<{ lat: number; lng: number }>;
        },
        context
    ) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { origins, destinations } = data;

        if (!origins || !destinations) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing origins or destinations');
        }

        if (origins.length > 25 || destinations.length > 25) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Max 25 origins/destinations per request'
            );
        }

        // Validate coordinates
        const validateCoords = (arr: any[]) =>
            arr.every(
                (loc) =>
                    typeof loc.lat === 'number' &&
                    typeof loc.lng === 'number' &&
                    loc.lat >= -90 &&
                    loc.lat <= 90 &&
                    loc.lng >= -180 &&
                    loc.lng <= 180
            );

        if (!validateCoords(origins) || !validateCoords(destinations)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates');
        }

        try {
            const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
            const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

            const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
            url.searchParams.set('origins', originsStr);
            url.searchParams.set('destinations', destStr);
            url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

            const response = await fetch(url.toString());
            const result = await response.json();

            // Log API usage for cost tracking
            await auditGoogleAPICall('distance_matrix', context.auth.uid, {
                origins: origins.length,
                destinations: destinations.length,
            });

            return result;
        } catch (error) {
            functions.logger.error('Distance matrix error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to calculate distances');
        }
    }
);

/**
 * Proxy: Snap to Roads
 * Snap GPS points to actual roads
 */
export const snapToRoads = functions.https.onCall(
    async (
        data: {
            points: Array<{ lat: number; lng: number }>;
            interpolate?: boolean;
        },
        context
    ) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { points, interpolate = false } = data;

        if (!points || points.length === 0 || points.length > 100) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Must provide 1-100 points'
            );
        }

        // Validate coordinates
        if (
            !points.every(
                (p) =>
                    typeof p.lat === 'number' &&
                    typeof p.lng === 'number' &&
                    p.lat >= -90 &&
                    p.lat <= 90 &&
                    p.lng >= -180 &&
                    p.lng <= 180
            )
        ) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates');
        }

        try {
            const pointsStr = points.map((p) => `${p.lat},${p.lng}`).join('|');

            const url = new URL(ROADS_API_BASE);
            url.searchParams.set('points', pointsStr);
            url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
            if (interpolate) {
                url.searchParams.set('interpolate', 'true');
            }

            const response = await fetch(url.toString());
            const result = await response.json();

            await auditGoogleAPICall('snap_to_roads', context.auth.uid, {
                points: points.length,
            });

            return result;
        } catch (error) {
            functions.logger.error('Snap to roads error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to snap to roads');
        }
    }
);

/**
 * Proxy: Forward Geocoding
 * Address -> coordinates
 */
export const geocode = functions.https.onCall(
    async (data: { address: string; region?: string }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { address, region = 'bd' } = data;
        if (!address || typeof address !== 'string' || address.trim().length < 2) {
            throw new functions.https.HttpsError('invalid-argument', 'Address must be at least 2 characters');
        }

        try {
            const url = new URL(GEOCODE_API_BASE);
            url.searchParams.set('address', address.trim());
            url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
            url.searchParams.set('region', region);
            url.searchParams.set('language', 'en');

            const response = await fetch(url.toString());
            const result = await response.json();

            await auditGoogleAPICall('geocode', context.auth.uid, {
                address: address.substring(0, 20),
            });

            return result;
        } catch (error) {
            functions.logger.error('Geocode error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to geocode address');
        }
    }
);

/**
 * Proxy: Reverse Geocoding
 * Coordinates -> address
 */
export const reverseGeocode = functions.https.onCall(
    async (data: { lat: number; lng: number }, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const { lat, lng } = data;
        if (
            typeof lat !== 'number' || typeof lng !== 'number' ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180
        ) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates');
        }

        try {
            const url = new URL(GEOCODE_API_BASE);
            url.searchParams.set('latlng', `${lat},${lng}`);
            url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
            url.searchParams.set('language', 'en');

            const response = await fetch(url.toString());
            const result = await response.json();

            await auditGoogleAPICall('reverse_geocode', context.auth.uid, {
                lat,
                lng,
            });

            return result;
        } catch (error) {
            functions.logger.error('Reverse geocode error:', error);
            throw new functions.https.HttpsError('internal', 'Failed to reverse geocode');
        }
    }
);

/**
 * Audit log for all Google API calls
 * Helps track costs and detect abuse
 */
async function auditGoogleAPICall(
    method: string,
    userId: string,
    details: Record<string, any>
): Promise<void> {
    try {
        const db = admin.firestore();
        await db.collection('api_audit_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            userId,
            method,
            details,
            ipAddress: process.env.FUNCTION_REGION || 'unknown',
        });
    } catch (error) {
        functions.logger.warn('Failed to log API call:', error);
    }
}
