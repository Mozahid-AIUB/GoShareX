-- ============================================================
-- ধাপ ৫ (geo-matching): destination-এর lat/lng রাখা
--
-- সমস্যা: এখন match হয় destination TEXT মিলিয়ে ("Banani" === "Banani")।
-- তাই "Kuril" vs "Kuril Bishwa Road" vs "Banani" vs "Banani Soinik Club"
-- কখনো match হয় না — যদিও কাছাকাছি/একই জায়গা।
--
-- সমাধান (low-cost, enterprise): TEXT না, COORDINATE মেলাই।
-- দুই গন্তব্য ~৭০০ মিটারের মধ্যে = একই গন্তব্য = match।
-- শুধু lat/lng লাগে — কোনো extra API খরচ নেই (haversine = pure math)।
--
-- তাই active_riders-এ destination-এর lat/lng রাখি।
-- ============================================================

alter table public.active_riders
  add column if not exists dest_lat double precision,
  add column if not exists dest_lng double precision;

-- posts-এও একই (post matching-ও পরে geo করতে পারি)
alter table public.posts
  add column if not exists dest_lat double precision,
  add column if not exists dest_lng double precision;
