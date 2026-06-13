-- ============================================================
-- 0024_admin_stats — ADMIN DASHBOARD backend
--
-- একটাই RPC `admin_stats()` সব সংখ্যা JSON-এ ফেরত দেয়।
-- নিরাপত্তা: শুধু admin email-এর user কল করতে পারবে; অন্য কেউ করলে error।
-- কোনো data বদলায় না — শুধু পড়ে (read-only)।
--
-- admin email পরিবর্তন করতে নিচের ARRAY edit করো।
-- ============================================================

-- কে admin সেটা ঠিক করার helper (এক জায়গায়, যাতে পরে সহজে বদলানো যায়)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select email from auth.users where id = auth.uid())
      = any (array[
        'mozahidislam343@gmail.com',
        'mozahidislam701@gmail.com'
      ]),
    false
  );
$$;

-- মূল dashboard RPC — সব সংখ্যা একসাথে JSON-এ
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  -- নিরাপত্তা গার্ড: admin না হলে কিছুই দেখাব না
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    -- ── এক নজরে ──
    'total_users',      (select count(*) from users),
    'active_24h',       (select count(*) from users where last_active > now() - interval '24 hours'),
    'active_7d',        (select count(*) from users where last_active > now() - interval '7 days'),
    'new_today',        (select count(*) from users where created_at > now() - interval '24 hours'),
    'live_now',         (select count(*) from active_riders where status = 'waiting'),
    'total_rides',      (select count(*) from rides),
    'completed_rides',  (select count(*) from rides where status = 'completed'),
    'total_saved',      (select coalesce(sum(split_amount),0) from rides where status = 'completed'),

    -- ── সমস্যা ধরা ──
    'cancelled_rides',  (select count(*) from rides where status = 'cancelled'),
    'suspended_users',  (select count(*) from users where is_suspended = true),
    'striked_users',    (select count(*) from users where strikes >= 1),
    'stuck_requests',   (select count(*) from ride_requests
                           where status = 'pending' and created_at < now() - interval '2 minutes'),
    'total_reports',    (select count(*) from reports),

    -- ── রিকোয়েস্ট accept rate ──
    'req_total',        (select count(*) from ride_requests),
    'req_accepted',     (select count(*) from ride_requests where status = 'accepted'),

    -- ── শেষ ৭ দিন দিন-প্রতি নতুন user (chart-এর জন্য) ──
    'daily',            (
      select coalesce(jsonb_agg(row), '[]'::jsonb) from (
        select jsonb_build_object(
          'date', d::date,
          'users', (select count(*) from users where created_at::date = d::date),
          'rides', (select count(*) from rides  where created_at::date = d::date)
        ) as row
        from generate_series(now() - interval '6 days', now(), interval '1 day') d
        order by d
      ) t
    ),

    'generated_at',     now()
  ) into result;

  return result;
end;
$$;

-- authenticated user-রা কল করতে পারবে (ভিতরে is_admin গার্ড আছে)
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.is_admin() to authenticated;
