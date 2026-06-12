# Deploy Rating Reminder System — Simple Steps

## Step 1: Run Migration in Supabase Dashboard

**Open:** https://app.supabase.com → GoShareX project → SQL Editor

**Copy entire SQL below and paste into SQL Editor, then click RUN:**

```sql
-- ============================================================
-- Rating reminder push notification system
-- ============================================================

create extension if not exists pg_cron;

-- १) ride_complete_ratings table
create table if not exists public.ride_complete_ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null,
  ratee_id uuid not null references public.users(id) on delete cascade,
  rater_id uuid not null references public.users(id) on delete cascade,
  ratee_name text not null,
  rater_name text not null,
  rated boolean not null default false,
  reminder_sent boolean not null default false,
  reminder_sent_at timestamp with time zone,
  completed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_ride_complete_ratings_ride on public.ride_complete_ratings(ride_id);
create index if not exists idx_ride_complete_ratings_ratee on public.ride_complete_ratings(ratee_id);
create index if not exists idx_ride_complete_ratings_pending on public.ride_complete_ratings(rated, reminder_sent)
  where not rated and not reminder_sent;

-- २) RLS
alter table public.ride_complete_ratings enable row level security;

drop policy if exists "users_view_own_ratings" on public.ride_complete_ratings;
create policy "users_view_own_ratings" on public.ride_complete_ratings
  for select using (auth.uid() = rater_id or auth.uid() = ratee_id);

-- ३) RPC: mark ride completed
drop function if exists public.mark_ride_completed(uuid, uuid, text, uuid, text);
create function public.mark_ride_completed(
  p_ride_id uuid,
  p_ratee_id uuid,
  p_ratee_name text,
  p_rater_id uuid,
  p_rater_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.ride_complete_ratings (
    ride_id, ratee_id, rater_id, ratee_name, rater_name
  ) values (p_ride_id, p_ratee_id, p_rater_id, p_ratee_name, p_rater_name)
  on conflict (ride_id, rater_id) do nothing
  returning id into v_id;
  
  -- If conflict (already exists), fetch existing
  if v_id is null then
    select id into v_id from public.ride_complete_ratings
    where ride_id = p_ride_id and rater_id = p_rater_id;
  end if;
  
  return v_id;
end;
$$;

revoke all on function public.mark_ride_completed(uuid, uuid, text, uuid, text) from public;
grant execute on function public.mark_ride_completed(uuid, uuid, text, uuid, text) to authenticated;

-- ४) Trigger: mark rating submitted
drop function if exists public.mark_rating_submitted() cascade;
create function public.mark_rating_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_complete_ratings
  set rated = true
  where ride_id = new.ride_id
    and rater_id = new.rater_id
    and not rated;
  return new;
end;
$$;

drop trigger if exists trg_mark_rating_submitted on public.ratings;
create trigger trg_mark_rating_submitted
  after insert on public.ratings
  for each row
  execute function public.mark_rating_submitted();

-- ५) Cron: queue reminders (every 5 min)
drop function if exists public.queue_rating_reminders();
create function public.queue_rating_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_complete_ratings
  set reminder_sent = true
  where not rated
    and not reminder_sent
    and completed_at < now() - interval '1 hour';
end;
$$;

do $$
begin
  perform cron.unschedule('queue-rating-reminders');
exception when others then null;
end $$;

select cron.schedule(
  'queue-rating-reminders',
  '*/5 * * * *',
  $$ select public.queue_rating_reminders(); $$
);

-- Success message
select 'Migration complete! ✓' as status;
```

**Expected output:** ✓ All queries executed successfully

---

## Step 2: Deploy Edge Function (Dashboard Method)

**Option A: Manual (Easiest)**

1. Open Supabase Dashboard → Edge Functions
2. Click **"Create a new function"**
3. Name: `send-rating-reminders`
4. Copy code from `supabase/functions/send-rating-reminders/index.ts` into the editor
5. Click **"Deploy"**

**Option B: CLI (If you have access token)**

```bash
cd d:/Way_To_Job/GoShareX/GoShareX
supabase login  # Paste GitHub access token
supabase functions deploy send-rating-reminders
```

---

## Step 3: Verify Setup

### Check if tables/functions created:

In Supabase SQL Editor:

```sql
-- Check table exists
select count(*) from information_schema.tables 
where table_name = 'ride_complete_ratings';

-- Check cron jobs
select jobname, schedule from cron.job 
where jobname like '%rating%';

-- Check RPC exists
select routine_name from information_schema.routines
where routine_name = 'mark_ride_completed';
```

Expected:
- `ride_complete_ratings` table: ✓
- `queue-rating-reminders` cron job: ✓
- `mark_ride_completed()` RPC: ✓

---

## Step 4: Test in App

### Test Ride Completion:

1. **Complete a test ride** (RideCompleteScreen)
2. **Submit rating** (stars + categories)
3. **Check database** (in SQL Editor):

```sql
select id, ride_id, rated, reminder_sent, completed_at
from public.ride_complete_ratings
order by created_at desc
limit 3;
```

You should see:
- `rated = true` (because you submitted rating)
- `reminder_sent = false` (because < 1 hour ago)

### Simulate 1-hour delay:

```sql
update public.ride_complete_ratings
set completed_at = now() - interval '2 hours'
where id = '<your_ride_id>';

-- Trigger cron job manually
select public.queue_rating_reminders();

-- Check again
select rated, reminder_sent from public.ride_complete_ratings
where id = '<your_ride_id>';
```

Expected: `reminder_sent = true`

### Test App Alert:

```
Kill app completely
Wait 30 seconds
Reopen app
Should see Alert: "Rate Your Ride 👍"
```

---

## Step 5: Production Setup (For Launch Phase)

When ready to go to production:

1. **Build production APK/IPA**
2. **Upload to Play Store** (FCM tokens only work in production)
3. **Get Firebase FCM Server Key**:
   - Go to Firebase Console → Project Settings
   - Download service account JSON
   - Get `private_key` from JSON
4. **Update Edge Function** with real FCM call (see code comments)

---

## Troubleshooting

### "Table already exists" error
→ This is fine! Migration already ran. Skip that part.

### "RLS policy already exists" error
→ Also fine! The `drop policy if exists` handles it.

### No alert showing in app
1. Make sure migration ran ✓
2. Make sure you completed a ride ✓
3. Check `ride_complete_ratings` table has entry ✓
4. Check cron job ran: `select * from cron.job_run_details limit 5;`

### "Cron job not found" error
→ You may need to enable pg_cron extension (usually enabled by default in Supabase)

```sql
create extension if not exists pg_cron;
```

---

## Summary

**3 minutes:** Run SQL migration
**2 minutes:** Deploy Edge Function
**5 minutes:** Test with ride completion
**Done!** 🎉

No CLI authentication needed — all done in Supabase Dashboard.
