import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

// Deno env থেকে Supabase URL + Service Role Key (automatic, no setup needed)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const firebaseApiKey = Deno.env.get('FIREBASE_API_KEY');

// Firebase FCM REST API endpoint
const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects/gosharex-48f4c/messages:send';

const supabase = createClient(supabaseUrl, supabaseKey);

interface RatingReminder {
  id: string;
  rater_id: string;
  ratee_id: string;
  ratee_name: string;
  rater_name: string;
  ride_id: string;
}

async function getAccessToken(): Promise<string> {
  // Firebase Admin SDK doesn't exist in Deno Edge Functions, so we use FCM API directly
  // This requires Google OAuth 2.0 credentials — for MVP, we'll assume Firebase project
  // has a service account with FCM permissions
  // In production: implement proper OAuth flow or use Firebase Admin SDK via Cloud Functions
  throw new Error('FCM push requires Firebase credentials — not available in Edge Function yet. Use Cloud Function or schedule app background task instead.');
}

async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  // Placeholder — actual implementation requires OAuth token
  // For MVP: edge function marks reminder_sent=true, app checks and prompts on open
  console.log(`[PLACEHOLDER] Would send: "${title}" to token: ${fcmToken.slice(0, 20)}...`);
}

export async function handler(req: Request): Promise<Response> {
  // Validate POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // ১) pending reminders যাদের reminder_sent = true (queue-এ)
    // কিন্তু push এখনো পাঠানো হয়নি
    const { data: reminders, error } = await supabase
      .from('ride_complete_ratings')
      .select('id, rater_id, ratee_id, ratee_name, rater_name, ride_id')
      .eq('rated', false)
      .eq('reminder_sent', true)
      .is('reminder_sent_at', null) // Not yet attempted
      .limit(50); // Batch 50 at a time

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 });
    }

    console.log(`Processing ${reminders.length} rating reminders...`);

    let sent = 0;
    let skipped = 0;

    for (const reminder of reminders as RatingReminder[]) {
      try {
        // রেমাইন্ডার receiver হচ্ছে যে rate করেনি (rater_id)
        // নাম হবে ratee_name (যাকে rate করবে তার নাম)
        const fcmTokenResult = await supabase
          .from('users')
          .select('fcm_token')
          .eq('id', reminder.rater_id)
          .single();

        const token = fcmTokenResult.data?.fcm_token;
        if (!token) {
          console.log(`Skipping reminder ${reminder.id}: no FCM token for user ${reminder.rater_id}`);
          skipped++;
          continue;
        }

        // FCM push (placeholder)
        await sendPushNotification(
          token,
          'Rate Your Ride 👍',
          `How was your ride with ${reminder.ratee_name}? Your rating helps them earn trust.`,
          {
            type: 'rate_ride_reminder',
            rideId: reminder.ride_id,
            rateeId: reminder.ratee_id,
          },
        );

        // Mark as sent (reminder_sent_at timestamp)
        await supabase
          .from('ride_complete_ratings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', reminder.id);

        sent++;
      } catch (pushError) {
        console.error(`Failed to send reminder ${reminder.id}:`, pushError);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, total: reminders.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
