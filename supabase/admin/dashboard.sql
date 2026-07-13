-- ============================================================
-- GoShareX — ADMIN DASHBOARD (শুধু তোমার চোখে দেখার জন্য)
--
-- ব্যবহার: Supabase Dashboard → SQL Editor → এই ফাইলের যেকোনো
--          একটা "ব্লক" select করে Run করো। প্রতিটা ব্লক আলাদা সংখ্যা দেখায়।
--          (একসাথে পুরো ফাইল run করলে শেষ result-টা দেখাবে — তাই এক এক করে।)
--
-- কোনো কিছু বদলায় না — শুধু পড়ে (read-only)। নিরাপদ।
-- ============================================================


-- ── ১. এক নজরে পুরো অ্যাপ (সবচেয়ে দরকারি — এটা রোজ দেখো) ──
select
  (select count(*) from public.users)                                          as মোট_ইউজার,
  (select count(*) from public.users where last_active > now() - interval '24 hours') as গত_২৪ঘন্টা_active,
  (select count(*) from public.users where last_active > now() - interval '7 days')   as গত_৭দিন_active,
  (select count(*) from public.users where created_at > now() - interval '24 hours')  as আজ_নতুন_সাইনআপ,
  (select count(*) from public.active_riders where status = 'waiting')          as এখন_লাইভ_খুঁজছে,
  (select count(*) from public.rides)                                           as মোট_রাইড,
  (select count(*) from public.rides where status = 'completed')               as সম্পন্ন_রাইড,
  (select coalesce(sum(split_amount),0) from public.rides where status='completed') as মোট_ভাড়া_বাঁচানো;


-- ── ২. রাইড কেমন চলছে (status অনুযায়ী ভাগ) ──
select
  status                              as রাইড_অবস্থা,
  count(*)                            as সংখ্যা,
  coalesce(sum(fare),0)               as মোট_ভাড়া,
  coalesce(sum(split_amount),0)       as জনপ্রতি_বাঁচানো
from public.rides
group by status
order by count(*) desc;


-- ── ৩. দিন-প্রতি বৃদ্ধি (নতুন user + নতুন ride, শেষ ১৪ দিন) ──
select
  d::date                                                                   as তারিখ,
  (select count(*) from public.users where created_at::date = d::date)      as নতুন_ইউজার,
  (select count(*) from public.rides where created_at::date = d::date)      as নতুন_রাইড
from generate_series(now() - interval '13 days', now(), interval '1 day') d
order by d desc;


-- ── ৪. সমস্যা ধরার জায়গা (এখানে সংখ্যা বাড়লে কিছু একটা গন্ডগোল) ──
select
  (select count(*) from public.rides where status = 'cancelled')               as বাতিল_রাইড,
  (select count(*) from public.users where is_suspended = true)                as সাসপেন্ড_ইউজার,
  (select count(*) from public.users where strikes >= 1)                       as স্ট্রাইক_আছে,
  (select count(*) from public.ride_requests where status = 'pending'
     and created_at < now() - interval '2 minutes')                           as আটকে_থাকা_রিকোয়েস্ট,
  (select count(*) from public.reports)                                        as মোট_রিপোর্ট,
  -- রাইড শুরু হয়েছে কিন্তু ১ দিনেও শেষ হয়নি (ভুতুড়ে রাইড)
  (select count(*) from public.rides
     where status = 'active' and started_at < now() - interval '1 day')        as ভুতুড়ে_রাইড;


-- ── ৫. রিকোয়েস্ট হ্যান্ডশেক কেমন কাজ করছে (accept rate) ──
select
  status                          as রিকোয়েস্ট_অবস্থা,
  count(*)                        as সংখ্যা,
  round(100.0 * count(*) / nullif((select count(*) from public.ride_requests),0), 1) as শতাংশ
from public.ride_requests
group by status
order by count(*) desc;


-- ── ৬. টপ ১০ সবচেয়ে active রাইডার (কারা অ্যাপ চালাচ্ছে) ──
select
  name                            as নাম,
  email                           as ইমেইল,
  total_rides                     as মোট_রাইড,
  rating                          as রেটিং,
  badge                           as ব্যাজ,
  last_active                     as শেষ_active
from public.users
order by total_rides desc, last_active desc nulls last
limit 10;


-- ── ৭. কোথায় বেশি যাচ্ছে মানুষ (টপ গন্তব্য) ──
select
  destination                     as গন্তব্য,
  count(*)                        as কতবার
from public.rides
group by destination
order by count(*) desc
limit 10;
