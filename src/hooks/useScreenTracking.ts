/**
 * useScreenTracking — Auto-track screen views in Firebase Analytics.
 * Fires once on mount, plus on each focus when used with useFocusEffect.
 */

import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { trackScreen } from '@/services/analytics/analyticsService';

/**
 * Track screen view once on mount.
 * Use this in screens that don't need re-tracking on focus.
 */
export function useScreenTracking(screenName: string): void {
  useEffect(() => {
    trackScreen(screenName);
  }, [screenName]);
}

/**
 * Track screen view every time the screen gains focus.
 * Use this for tab screens / commonly revisited screens.
 */
export function useScreenFocusTracking(screenName: string): void {
  useFocusEffect(
    useCallback(() => {
      trackScreen(screenName);
    }, [screenName]),
  );
}
