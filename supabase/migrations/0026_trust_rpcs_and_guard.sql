-- ============================================================
-- 0026_trust_rpcs_and_guard — TRUST/RATING cheat-proof (H1 fix)
--
-- সমস্যা: এতদিন client সরাসরি users.rating/badge/strikes/total_rides/
-- total_saved/trust_score বদলাতে পারত। মানে যে কেউ নিজেকে 5★ "Elite" +
-- ৯৯৯৯ saved বানাতে পারত। পুরো trust সিস্টেম অর্থহীন।
--
-- সমাধান (production-grade):
--   1) সব protected-কলাম লেখা security-definer RPC-তে সরানো হলো। RPC নিজে
--      সংখ্যা হিসাব করে — client কোনো সংখ্যা পাঠায় না, তাই cheat অসম্ভব।
--   2) একটা BEFORE UPDATE trigger client থেকে protected কলাম বদলানো আটকায়।
--      RPC গুলো security-definer + session-flag দিয়ে trigger বাইপাস করে।
--
-- protected কলাম: rating, strikes, badge, total_rides, total_saved,
--   completion_rate, is_suspended, suspended_until, suspension_reason,
--   trust_score, total_ratings, trust_breakdown
-- ============================================================

-- ── ০. badge হিসাবের helper (ratingService-এর computeBadge হুবহু) ──
create or replace function public.compute_badge(
  trust_score int, total_rides int, strikes int
) returns text
language sql immutable
as $$
  select case
    when strikes >= 3 then 'Unreliable'
    when total_rides >= 50 and trust_score >= 92 then 'Elite Rider'
    when total_rides >= 15 and trust_score >= 80 then 'Trusted'
    when total_rides >= 5  and trust_score >= 60 then 'Regular'
    else 'New Rider'
  end;
$$;

-- ============================================================
-- ১. trust recalculation — ratings টেবিল থেকে নিজে গড় করে সেট করে।
-- client শুধু rated_id পাঠায়; কোনো score পাঠাতে পারে না।
-- যে কেউ কল করতে পারে (rating দেওয়ার পর), কিন্তু শুধু গণনা — fake করা যায় না।
-- ============================================================
create or replace function public.recalc_user_trust(p_rated_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count      int;
  v_avg_stars  numeric;
  v_friendly   int;
  v_safe       int;
  v_trust      int;
  v_breakdown  jsonb;
  v_rides      int;
  v_strikes    int;
  v_badge      text;
begin
  select count(*),
         coalesce(avg(stars),0),
         coalesce(sum(case when friendly  then 1 else 0 end),0),
         coalesce(sum(case when safe_ride then 1 else 0 end),0)
    into v_count, v_avg_stars, v_friendly, v_safe
    from ratings where rated_id = p_rated_id;

  if v_count = 0 then return; end if;

  -- Firebase formula হুবহু: 70% star + 30% category
  v_trust := round((v_avg_stars / 5) * 70 + ((v_friendly + v_safe)::numeric / (v_count * 2)) * 30);

  select total_rides, strikes into v_rides, v_strikes
    from users where id = p_rated_id;

  v_badge := public.compute_badge(v_trust, coalesce(v_rides,0), coalesce(v_strikes,0));

  v_breakdown := jsonb_build_object(
    'totalRatings', v_count,
    'avgStars',     round(v_avg_stars * 10) / 10,
    'friendlyPct',  round((v_friendly::numeric / v_count) * 100),
    'safeRidePct',  round((v_safe::numeric / v_count) * 100),
    'trustScore',   v_trust
  );

  update users set
    trust_score     = v_trust,
    rating          = round(v_avg_stars * 10) / 10,
    total_ratings   = v_count,
    trust_breakdown = v_breakdown,
    badge           = v_badge
  where id = p_rated_id;
end;
$$;

-- ============================================================
-- ২. ride সম্পন্ন → দুই rider-এর total_rides/total_saved বাড়ায়,
-- strike কমায়, badge re-হিসাব। client শুধু ride_id পাঠায়।
-- নিরাপত্তা: caller অবশ্যই ওই ride-এর participant হতে হবে, আর ride
-- 'completed' status-এ থাকতে হবে — নাহলে কেউ ভুয়া ride দিয়ে count বাড়াবে।
-- ============================================================
create or replace function public.apply_ride_completion(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r           rides%rowtype;
  v_split     numeric;
begin
  select * into r from rides where id = p_ride_id;
  if not found then raise exception 'ride not found'; end if;

  -- caller participant কিনা
  if auth.uid() <> r.rider1 and auth.uid() <> r.rider2 then
    raise exception 'not a participant';
  end if;

  -- শুধু completed ride-ই গোনা হবে
  if r.status <> 'completed' then
    raise exception 'ride not completed';
  end if;

  -- double-count ঠেকাতে একটা ফ্ল্যাগ (rides.counted)
  if coalesce(r.counted, false) then return; end if;

  v_split := coalesce(r.split_amount, 0);

  -- দুই rider-এর counter বাড়াই + strike কমাই + badge re-হিসাব
  update users u set
    total_rides = u.total_rides + 1,
    total_saved = u.total_saved + v_split,
    strikes     = greatest(0, u.strikes - 1),
    badge       = public.compute_badge(u.trust_score, u.total_rides + 1, greatest(0, u.strikes - 1))
  where u.id in (r.rider1, r.rider2);

  update rides set counted = true where id = p_ride_id;
end;
$$;

-- counted কলাম (একবারই গোনা হবে, idempotent)
alter table public.rides add column if not exists counted boolean not null default false;

-- ============================================================
-- ৩. ride cancel → নিজের strike +1, ৩-এ পৌঁছালে ২৪ঘণ্টা suspend।
-- caller শুধু নিজেকেই strike দিতে পারে (auth.uid())।
-- ============================================================
create or replace function public.record_my_cancellation()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_strikes int;
  v_until   timestamptz;
begin
  select strikes + 1 into v_strikes from users where id = auth.uid();

  if v_strikes >= 3 then
    v_until := now() + interval '24 hours';
    update users set
      strikes = v_strikes,
      is_suspended = true,
      suspended_until = v_until,
      suspension_reason = 'Account suspended after ' || v_strikes ||
        ' ride cancellations. Suspension until ' || v_until::text
    where id = auth.uid();
    return true;
  end if;

  update users set strikes = v_strikes where id = auth.uid();
  return false;
end;
$$;

-- ============================================================
-- ৪. মেয়াদ-উত্তীর্ণ suspension নিজে clear (checkSuspension-এর জন্য)।
-- শুধু নিজের, আর শুধু সময় পেরোলে।
-- ============================================================
create or replace function public.clear_expired_suspension()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update users set
    is_suspended = false,
    suspended_until = null,
    suspension_reason = null
  where id = auth.uid()
    and is_suspended = true
    and suspended_until is not null
    and suspended_until <= now();
end;
$$;

-- ============================================================
-- ৫. GUARD trigger — client থেকে protected কলাম বদলানো আটকায়।
-- security-definer RPC গুলো session-flag সেট করে বাইপাস করবে।
-- ============================================================
create or replace function public.guard_user_protected_cols()
returns trigger
language plpgsql
as $$
begin
  -- RPC গুলো এই flag সেট করে (নিচে দেখো); flag থাকলে guard skip
  if current_setting('app.bypass_user_guard', true) = 'on' then
    return new;
  end if;

  if (new.rating, new.strikes, new.badge, new.total_rides, new.total_saved,
      new.completion_rate, new.is_suspended, new.suspended_until,
      new.suspension_reason, new.trust_score, new.total_ratings, new.trust_breakdown)
     is distinct from
     (old.rating, old.strikes, old.badge, old.total_rides, old.total_saved,
      old.completion_rate, old.is_suspended, old.suspended_until,
      old.suspension_reason, old.trust_score, old.total_ratings, old.trust_breakdown)
  then
    raise exception 'protected columns can only be changed by server (RPC)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_user_cols on public.users;
create trigger trg_guard_user_cols
  before update on public.users
  for each row execute function public.guard_user_protected_cols();

-- RPC গুলোতে guard বাইপাস করতে flag সেট করি (security-definer context-এ)
-- প্রতিটা RPC-র শুরুতে এই flag সেট করা দরকার — তাই RPC body-তে যোগ করি।
-- (নিচে wrapper দিয়ে সব RPC-তে এক লাইনে flag সেট করা হলো)

-- recalc_user_trust + apply_ride_completion + record_my_cancellation +
-- clear_expired_suspension — সবগুলোর শুরুতে flag দরকার। সহজ রাখতে প্রতিটায়
-- perform set_config যোগ করি (নিচে re-create করছি body-সহ):

create or replace function public.recalc_user_trust(p_rated_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_count int; v_avg_stars numeric; v_friendly int; v_safe int;
  v_trust int; v_breakdown jsonb; v_rides int; v_strikes int; v_badge text;
begin
  perform set_config('app.bypass_user_guard','on', true);
  select count(*), coalesce(avg(stars),0),
         coalesce(sum(case when friendly then 1 else 0 end),0),
         coalesce(sum(case when safe_ride then 1 else 0 end),0)
    into v_count, v_avg_stars, v_friendly, v_safe
    from ratings where rated_id = p_rated_id;
  if v_count = 0 then return; end if;
  v_trust := round((v_avg_stars / 5) * 70 + ((v_friendly + v_safe)::numeric / (v_count * 2)) * 30);
  select total_rides, strikes into v_rides, v_strikes from users where id = p_rated_id;
  v_badge := public.compute_badge(v_trust, coalesce(v_rides,0), coalesce(v_strikes,0));
  v_breakdown := jsonb_build_object(
    'totalRatings', v_count, 'avgStars', round(v_avg_stars*10)/10,
    'friendlyPct', round((v_friendly::numeric/v_count)*100),
    'safeRidePct', round((v_safe::numeric/v_count)*100), 'trustScore', v_trust);
  update users set trust_score=v_trust, rating=round(v_avg_stars*10)/10,
    total_ratings=v_count, trust_breakdown=v_breakdown, badge=v_badge
  where id = p_rated_id;
end; $$;

create or replace function public.apply_ride_completion(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r rides%rowtype; v_split numeric;
begin
  perform set_config('app.bypass_user_guard','on', true);
  select * into r from rides where id = p_ride_id;
  if not found then raise exception 'ride not found'; end if;
  if auth.uid() <> r.rider1 and auth.uid() <> r.rider2 then raise exception 'not a participant'; end if;
  if r.status <> 'completed' then raise exception 'ride not completed'; end if;
  if coalesce(r.counted, false) then return; end if;
  v_split := coalesce(r.split_amount, 0);
  update users u set total_rides = u.total_rides + 1, total_saved = u.total_saved + v_split,
    strikes = greatest(0, u.strikes - 1),
    badge = public.compute_badge(u.trust_score, u.total_rides + 1, greatest(0, u.strikes - 1))
  where u.id in (r.rider1, r.rider2);
  update rides set counted = true where id = p_ride_id;
end; $$;

create or replace function public.record_my_cancellation()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_strikes int; v_until timestamptz;
begin
  perform set_config('app.bypass_user_guard','on', true);
  select strikes + 1 into v_strikes from users where id = auth.uid();
  if v_strikes >= 3 then
    v_until := now() + interval '24 hours';
    update users set strikes=v_strikes, is_suspended=true, suspended_until=v_until,
      suspension_reason='Account suspended after '||v_strikes||' ride cancellations. Suspension until '||v_until::text
    where id = auth.uid();
    return true;
  end if;
  update users set strikes = v_strikes where id = auth.uid();
  return false;
end; $$;

create or replace function public.clear_expired_suspension()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_user_guard','on', true);
  update users set is_suspended=false, suspended_until=null, suspension_reason=null
  where id = auth.uid() and is_suspended=true
    and suspended_until is not null and suspended_until <= now();
end; $$;

-- ── grants ──
grant execute on function public.recalc_user_trust(uuid)   to authenticated;
grant execute on function public.apply_ride_completion(uuid) to authenticated;
grant execute on function public.record_my_cancellation()   to authenticated;
grant execute on function public.clear_expired_suspension() to authenticated;

-- ============================================================
-- যাচাই:
--   -- client হিসেবে এটা এখন FAIL করবে (সঠিক):
--   update users set badge='Elite Rider', rating=5 where id = auth.uid();
--   -- → ERROR: protected columns can only be changed by server (RPC)
-- ============================================================
