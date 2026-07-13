# Deploy Rating Reminder System (Uber-style Push)

## Step 1: Run Migration in Supabase SQL Editor

1. **Open** [Supabase Dashboard](https://app.supabase.com) → Select GoShareX project
2. **SQL Editor** → New Query
3. **Copy-paste** entire `supabase/migrations/0023_rating_reminder_push.sql` content
4. **Run** (green button)

### Expected output:
```
Query executed successfully (create table, indexes, functions, triggers, cron jobs)
✓ ride_complete_ratings table created
✓ RLS policy created
✓ mark_ride_completed() RPC created
✓ mark_rating_submitted() trigger created
✓ queue_rating_reminders() job scheduled (every 5 min)
✓ trigger_send_rating_reminders() job scheduled (every 1 min)
```

---

## Step 2: Deploy Edge Function

### 2a. Install Supabase CLI (if not already)
```bash
npm install -g supabase
```

### 2b. Login to Supabase
```bash
supabase login
```
- Opens browser → authenticate with GitHub
- Paste access token back to terminal

### 2c. Deploy Function
```bash
cd d:/Way_To_Job/GoShareX/GoShareX
supabase functions deploy send-rating-reminders
```

Expected:
```
Deploying function 'send-rating-reminders'...
✓ Function deployed successfully at:
  https://<your-project-id>.supabase.co/functions/v1/send-rating-reminders
```

### 2d. Test Edge Function
```bash
supabase functions invoke send-rating-reminders --project-id <your-project-id>
```

Expected response:
```json
{
  "sent": 0,
  "skipped": 0,
  "total": 0
}
```
(0 because no pending reminders yet)

---

## Step 3: Verify in App

### 3a. Complete a test ride
- Start ride as User A
- Complete ride
- Rate User B (submit rating)
- User B's `ride_complete_ratings.rated` should be `true`

### 3b. Simulate 1-hour delay (testing only)
In Supabase SQL Editor:
```sql
-- Manually set completed_at to 2 hours ago
update public.ride_complete_ratings
set completed_at = now() - interval '2 hours'
where id = '<ride_id>';

-- Manually run cron job
select public.queue_rating_reminders();

-- Check if reminder_sent is now true
select id, ride_id, rated, reminder_sent, completed_at
from public.ride_complete_ratings
where id = '<ride_id>';
```

### 3c. Check app reminder
- Kill app completely
- Wait 30s (for cron to trigger)
- Reopen app
- Should see Alert: "Rate Your Ride 👍"

---

## Step 4: Production Setup (For Launch)

### 4a. Enable Push Notifications
Currently push is **disabled** (needs production build + FCM token).

To enable:
1. Build production APK/IPA
2. Upload to Play Store / App Store (FCM tokens only available in production)
3. Get Firebase FCM Server Key
4. Update Edge Function to use FCM API with service account credentials

### 4b. Update Edge Function for FCM
Replace placeholder in `send-rating-reminders/index.ts`:
```typescript
// Get FCM access token from Google OAuth
const accessToken = await getAccessToken();

// Send real push via FCM API
const response = await fetch(FCM_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: {
      token: fcmToken,
      notification: {
        title: 'Rate Your Ride 👍',
        body: `How was your ride with ${reminder.ratee_name}?`,
      },
      data: {
        type: 'rate_ride_reminder',
        rideId: reminder.ride_id,
        rateeId: reminder.ratee_id,
      },
    },
  }),
});
```

---

## Troubleshooting

### "Invalid schedule" error
- **Fix**: Use cron format `'*/5 * * * *'` (5 min) or `'* * * * *'` (1 min)
- Don't use `'5 minutes'` — that's pg_cron v1 syntax (old)

### "Function not found" error
- **Check**: Edge Function deployed? Run `supabase functions list`
- **Check**: Project ID correct in URL?

### No reminder showing up
1. Check ride marked as completed: `select * from ride_complete_ratings where ride_id = '...'`
2. Check cron job ran: `select * from cron.job where jobname like '%rating%'`
3. Check App logs: `adb logcat | grep useUnratedRideReminder`

### Push notification not received
- Production build required (Expo Go doesn't support FCM)
- Check user has FCM token: `select fcm_token from users where id = '...'`
- Check Edge Function logs: Supabase Dashboard → Edge Functions

---

## Current Status

✅ **Code Ready**
- [x] Migration SQL
- [x] Edge Function
- [x] App hook (useUnratedRideReminder)

⏳ **Pending Your Action**
- [ ] Run migration
- [ ] Deploy Edge Function
- [ ] Test with actual ride completion
- [ ] (Later) Production FCM setup

---

## Timeline

**Now**: Run migration + deploy function = 10 mins
**Test**: Complete test ride → wait 1 hour (or simulate) = 5 mins
**Production**: After Play Store upload & FCM server key = 30 mins
