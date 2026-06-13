-- ============================================================
-- GEO-MATCHING REAL TEST — তোমার আসল GPS অবস্থানের চারপাশে।
--
--   তোমার অবস্থান : 23.7910275, 90.3869812  (কচুক্ষেত এলাকা)
--   তোমার গন্তব্য : 23.8207146, 90.4231228  (কুড়িল)
--
-- rider-দের তোমার চারপাশে নিখুঁতভাবে বসানো — zone (meet) ও same-dest দুটো
-- আলাদাভাবে যাচাই করতে। same-dest সীমা = 500m, zone = 150/250/350m।
--
-- প্রত্যাশিত ফল (zone বদলে দেখো):
--   ┌─────────────────────┬─────────┬──────────┬──────────────────────────┐
--   │ rider               │ তুমি থেকে│ গন্তব্য gap│ MATCH?                   │
--   ├─────────────────────┼─────────┼──────────┼──────────────────────────┤
--   │ A — Kuril Flyover   │  ~90m   │ ~130m    │ ✅ সব zone-এ (সবুজ)       │
--   │ B — Kuril Bishwa    │ ~135m   │ ~190m    │ ✅ সব zone-এ (সবুজ)       │
--   │ C — Kuril Chowrasta │ ~235m   │ ~220m    │ zone 150=কমলা, 250+=সবুজ │
--   │ D — Banani          │ ~100m   │ ~3.7km   │ ❌ কমলা (ভিন্ন গন্তব্য)    │
--   │ E — GPS fail        │  ~60m   │ INVALID  │ ❌ কমলা (guard)           │
--   └─────────────────────┴─────────┴──────────┴──────────────────────────┘
-- ============================================================

begin;
set local session_replication_role = 'replica';   -- FK trigger সাময়িক বন্ধ

-- শুধু test rider মুছি (তোমার নিজের row রাখি — অ্যাপ থেকে লেখা)
delete from public.active_riders
where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

insert into public.active_riders
  (user_id, name, lat, lng, destination, dest_lat, dest_lng, pickup_point, status, rating, badge, updated_at)
values
  -- A: ~90m away, গন্তব্য কুড়িলের কাছে → ✅ MATCH (সব zone)
  ('11111111-1111-1111-1111-111111111111', 'Rider A — Kuril Flyover',
   23.791745, 90.387335, 'Kuril Flyover', 23.8216129, 90.4239084, 'Kochukhet', 'waiting', 4.8, 'Trusted', now()),

  -- B: ~135m away, গন্তব্য কুড়িলের কাছে → ✅ MATCH (সব zone)
  ('22222222-2222-2222-2222-222222222222', 'Rider B — Kuril Bishwa Road',
   23.790128, 90.387825, 'Kuril Bishwa Road', 23.8193671, 90.4243012, 'Kochukhet', 'waiting', 4.5, 'New Rider', now()),

  -- C: ~235m away, গন্তব্য কুড়িলের কাছে → zone 150=কমলা, 250+=সবুজ
  ('33333333-3333-3333-3333-333333333333', 'Rider C — Kuril Chowrasta',
   23.792374, 90.388709, 'Kuril Chowrasta', 23.8225112, 90.4221408, 'Kochukhet', 'waiting', 4.2, 'Trusted', now()),

  -- D: ~100m away কিন্তু গন্তব্য বনানী (3.7km দূরে) → ❌ কমলা
  ('44444444-4444-4444-4444-444444444444', 'Rider D — Banani (no match)',
   23.790488, 90.387727, 'Banani', 23.7937, 90.4007, 'Kochukhet', 'waiting', 4.0, 'New Rider', now()),

  -- E: ~60m away, গন্তব্য 0,0 (GPS fail) → ❌ কমলা (guard)
  ('55555555-5555-5555-5555-555555555555', 'Rider E — GPS fail (no match)',
   23.791476, 90.387236, 'Unknown', 0, 0, 'Kochukhet', 'waiting', 3.9, 'New Rider', now());

commit;

-- যাচাই
select name, destination, lat, lng, dest_lat, dest_lng from public.active_riders order by name;

-- ============================================================
-- টেস্ট শেষে cleanup (আলাদা করে run করো):
--   delete from public.active_riders
--   where user_id like '%-1111-%' or user_id like '%-2222-%'
--      or user_id like '%-3333-%' or user_id like '%-4444-%'
--      or user_id like '%-5555-%';
-- ============================================================
