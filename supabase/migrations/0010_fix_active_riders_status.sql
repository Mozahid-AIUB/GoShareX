-- ============================================================
-- ধাপ ৫ (presence): active_riders.status constraint ঠিক করা
--
-- ধাপ ৩-এ ভুল করে status check-এ 'in_ride' দেওয়া হয়েছিল
-- (firebase.types থেকে)। কিন্তু অ্যাপের আসল টাইপ (user.types.ts) হলো
-- 'waiting' | 'matched' | 'riding'। তাই 'in_ride' -> 'riding' করি,
-- নাহলে অ্যাপ 'riding' পাঠালে DB reject করবে।
-- ============================================================

alter table public.active_riders drop constraint if exists active_riders_status_check;
alter table public.active_riders
  add constraint active_riders_status_check
  check (status in ('waiting','matched','riding'));

-- পুরনো কোনো row-তে 'in_ride' থাকলে 'riding' করি (নিরাপত্তা)
update public.active_riders set status = 'riding' where status = 'in_ride';
