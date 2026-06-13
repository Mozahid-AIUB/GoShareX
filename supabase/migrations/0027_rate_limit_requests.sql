-- ============================================================
-- 0027_rate_limit_requests — ride request স্প্যাম আটকানো (M1)
--
-- সমস্যা: কেউ স্ক্রিপ্ট দিয়ে সেকেন্ডে অনেক request পাঠিয়ে অন্যদের
-- harass করতে পারে বা DB ভরিয়ে দিতে পারে।
--
-- সমাধান: এক sender একই receiver-কে ৩০ সেকেন্ডে একবারই pending request
-- পাঠাতে পারবে। trigger BEFORE INSERT-এ চেক করে।
--
-- নোট: Supabase Auth-এর signup/login rate-limit আলাদা — সেটা Dashboard →
-- Authentication → Rate Limits-এ enable করতে হবে (DB migration নয়)।
-- ============================================================

create or replace function public.guard_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
begin
  -- একই sender→receiver, শেষ ৩০ সেকেন্ডে কয়টা request?
  select count(*) into v_recent
  from ride_requests
  where from_user = new.from_user
    and to_user   = new.to_user
    and created_at > now() - interval '30 seconds';

  if v_recent >= 1 then
    raise exception 'rate_limited: please wait before sending another request';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_request_rate_limit on public.ride_requests;
create trigger trg_request_rate_limit
  before insert on public.ride_requests
  for each row execute function public.guard_request_rate_limit();

-- ============================================================
-- যাচাই: পরপর দুবার একই receiver-কে request পাঠাও →
--   দ্বিতীয়টা "rate_limited" error দেবে।
-- ============================================================
