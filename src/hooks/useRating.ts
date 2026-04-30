import { useCallback, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuthStore } from '@/store';
import { handleError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { db } from '@/services/firebase/config';

interface SubmitRatingParams {
  rideId: string;
  ratedUserId: string;
  rating: number;
  feedback?: string;
}

interface UseRatingResult {
  submitRating: (params: SubmitRatingParams) => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Provides a `submitRating` action that writes a rating to Firestore
 * and triggers a Cloud Function to recalculate the rated user's average.
 */
export function useRating(): UseRatingResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const submitRating = useCallback(
    async ({
      rideId,
      ratedUserId,
      rating,
      feedback,
    }: SubmitRatingParams): Promise<boolean> => {
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const batch = writeBatch(db);

        // Write the rating document
        const ratingRef = doc(db, 'ratings', `${rideId}_${user.uid}`);
        batch.set(ratingRef, {
          rideId,
          raterId: user.uid,
          ratedUserId,
          rating,
          feedback: feedback ?? '',
          createdAt: serverTimestamp(),
        });

        // Mark rating as submitted on the ride document
        const rideRef = doc(db, 'rides', rideId);
        batch.update(rideRef, {
          [`${user.uid === ratedUserId ? 'rider2Rating' : 'rider1Rating'}`]: rating,
        });

        await batch.commit();

        logger.info('useRating', `Rating submitted for ride ${rideId}`);
        return true;
      } catch (err) {
        const msg = handleError(err);
        setError(msg);
        logger.error('useRating.submitRating', err);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user],
  );

  return { submitRating, isSubmitting, error };
}
