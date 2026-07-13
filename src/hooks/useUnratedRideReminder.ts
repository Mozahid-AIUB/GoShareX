// ============================================================
// useUnratedRideReminder — App খোলা হলে check করে unrated rides
// যেগুলো 1 hour+ পুরনো এবং reminder ready — user-কে prompt করে।
// ============================================================
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/config/supabase.config';
import { logger } from '@/utils/logger';
import { Alert } from 'react-native';

interface UnratedReminder {
  id: string;
  ride_id: string;
  ratee_id: string;
  ratee_name: string;
  rater_name: string;
}

export function useUnratedRideReminder() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.uid) return;

    const checkUnratedReminders = async () => {
      try {
        // যাদের ride complete হয়েছে ১ hour+ আগে কিন্তু এখনো rate করেনি
        const { data, error } = await supabase
          .from('ride_complete_ratings')
          .select('id, ride_id, ratee_id, ratee_name, rater_name')
          .eq('rater_id', user.uid)
          .eq('rated', false)
          .eq('reminder_sent', true)
          .limit(1) // একবারে একটাই show করি
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows, যা expected
          logger.warn('useUnratedRideReminder', error);
          return;
        }

        if (data) {
          // Rating reminder দেখাই
          Alert.alert(
            'Rate Your Ride 👍',
            `How was your ride with ${data.ratee_name}? Your rating helps them earn trust.`,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Rate Now',
                onPress: async () => {
                  // Mark entry as "user saw this reminder" — সম্ভব নয় এখানে navigate করব না,
                  // শুধু Alert show করি; RideCompleteScreen auto-navigate এর মাধ্যমে rating UI পাওয়া যাবে
                  // আপাতত: entry unchanged রাখি, পরবর্তী app open-এ আবার দেখাবে
                  // Real solution: notification feed item create করা বা "one-time showed" flag যোগ করা
                  logger.info('useUnratedRideReminder', 'User tapped "Rate Now" for ride ' + data.ride_id);
                },
              },
            ],
          );
        }
      } catch (err) {
        logger.warn('useUnratedRideReminder.check', err);
      }
    };

    checkUnratedReminders();
  }, [user?.uid]);
}
