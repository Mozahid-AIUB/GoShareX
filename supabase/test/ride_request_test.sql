-- ════════════════════════════════════════════════════════════
-- PREMIUM REQUEST CARD টেস্ট (দুই ফোন ছাড়া)
--
-- একটা request পাঠাই তোমার কাছে — rating, badge, vehicle, GPS সহ।
-- অ্যাপের Home-এ premium card আসবে (avatar + ⭐rating + badge + দূরত্ব)।
--
--   ১) অ্যাপে Home খোলো
--   ২) নিচের পুরো অংশ copy করে Supabase SQL editor-এ Run
--   ৩) Home-এর উপরে premium card আসবে
-- ════════════════════════════════════════════════════════════

begin;
set local session_replication_role = 'replica';

-- আগের পুরনো request মুছি (fresh card-এর জন্য)
delete from public.ride_requests where to_user = '889322c9-5a96-4e93-89e6-de13530a00ff';

insert into public.ride_requests (
  from_user, to_user, from_name,
  destination, dest_lat, dest_lng, fare,
  from_rating, from_badge, from_vehicle,
  from_lat, from_lng,
  status
) values (
  '11111111-1111-1111-1111-111111111111',   -- from: Rider A
  '889322c9-5a96-4e93-89e6-de13530a00ff',   -- to: তুমি
  'Rahim Uddin',
  'Kuril Flyover', 23.8203, 90.4203, 25,
  4.8,                                        -- ⭐ rating
  'Trusted',                                 -- badge
  'bike',                                    -- vehicle (motorcycle icon)
  23.7935, 90.3889,                          -- sender GPS (কচুক্ষেত — দূরত্ব হিসাব হবে)
  'pending'
);

commit;

-- ✅ Run করার পর Home-এ premium card আসবে:
--   🏍️ Rahim Uddin  [Trusted]
--       ⭐ 4.8 · (কত দূরে)
--   🎯 Kuril Flyover         ৳25 each
--   [ Decline ] [ Accept & Chat ]


-- ════════════════════════════════════════════════════════════
-- টেস্ট শেষে — পরিষ্কার করতে এই লাইন Run করো:
-- ════════════════════════════════════════════════════════════
-- delete from public.ride_requests where to_user = '889322c9-5a96-4e93-89e6-de13530a00ff';
