-- ============================================================
-- 0025_users_pii_lockdown — PII LEAK বন্ধ (CRITICAL security fix)
--
-- সমস্যা ছিল: 0002-এর "users: read for authenticated" policy যেকোনো
-- logged-in user-কে সবার পুরো row (email, phone_number, student_id) পড়তে
-- দিত। এটা privacy/GDPR লঙ্ঘন + stalking ঝুঁকি।
--
-- সমাধান:
--   1) users টেবিল থেকে public read বন্ধ — শুধু নিজের row পড়া যাবে।
--   2) matching/UI-র জন্য non-sensitive কলামের একটা VIEW রাখা হলো।
--
-- ⚠️ Map/nearby-তে কোনো প্রভাব নেই — ওটা active_riders টেবিল থেকে আসে
--    (সেখানে phone/email নেই-ই)। সব from('users') query নিজের uid দিয়ে,
--    তাই কোনো screen ভাঙবে না।
-- ============================================================

-- ── 1. পুরনো ঢিলা policy ফেলে দাও ──
drop policy if exists "users: read for authenticated" on public.users;

-- ── 2. শুধু নিজের পুরো row পড়া যাবে (phone/email/student_id সহ) ──
create policy "users: read own full row"
  on public.users for select
  using (auth.uid() = id);

-- ── 3. অন্যদের জন্য non-sensitive profile — VIEW দিয়ে ──
-- (security_invoker = on মানে view নিজে RLS bypass করবে না, কিন্তু আমরা
--  নিচে আলাদা grant দিচ্ছি যাতে safe কলাম সবাই পড়তে পারে।)
create or replace view public.user_public_profiles
with (security_invoker = off) as
  select
    id,
    name,
    photo_url,
    rating,
    badge,
    total_rides,
    completion_rate
  from public.users;

-- view-টা সব authenticated user পড়তে পারবে (এতে কোনো PII নেই)
grant select on public.user_public_profiles to authenticated;

-- ============================================================
-- যাচাই (অন্য user হিসেবে চালালে ০ row আসা উচিত):
--   select phone_number from public.users where id <> auth.uid() limit 1;
-- আর এটা কাজ করবে (safe):
--   select name, rating from public.user_public_profiles limit 5;
-- ============================================================
