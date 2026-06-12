-- ════════════════════════════════════════════════════════════
-- সহজ টেস্ট: কেউ তোমাকে request পাঠাল → Home-এ banner আসে কিনা
--
-- যা করবে:
--   ১) অ্যাপে Home খোলো (গন্তব্য কুড়িল সিলেক্ট করা)
--   ২) নিচের পুরো অংশটা copy করে Supabase SQL editor-এ Run করো
--   ৩) অ্যাপের Home-এ উপরে banner আসা উচিত — সাথে সাথে
--
--   ⚠️ আগে 0019 migration run করা থাকতে হবে।
-- ════════════════════════════════════════════════════════════

begin;
set local session_replication_role = 'replica';

insert into public.ride_requests
  (from_user, to_user, from_name, destination, dest_lat, dest_lng, fare, status)
values (
  '11111111-1111-1111-1111-111111111111',
  '889322c9-5a96-4e93-89e6-de13530a00ff',
  'Rider A',
  'Kuril Flyover',
  23.8203, 90.4203,
  25,
  'pending'
);

commit;

-- ✅ Run করার পর অ্যাপের Home-এ এই banner আসবে:
--    "Rider A wants to share a ride — To Kuril Flyover · ৳25 each [Decline][Accept]"
--
-- Decline চাপো → banner চলে যায়।  Accept চাপো → chat খোলে।


-- ════════════════════════════════════════════════════════════
-- টেস্ট শেষে — এই লাইনটা copy করে Run করো (পরিষ্কার করতে):
-- ════════════════════════════════════════════════════════════
-- delete from public.ride_requests where to_user = '889322c9-5a96-4e93-89e6-de13530a00ff';
