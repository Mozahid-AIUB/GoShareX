-- ============================================================
-- NOTIFICATION TEST (দুই ফোন ছাড়া — SQL দিয়ে)
--
-- ধাপে ধাপে run করো। প্রতিটা অংশ আলাদা select করে Run চাপতে পারো,
-- অথবা পুরোটা একসাথে।
-- ============================================================

-- ── ধাপ ১: realtime publication-এ notifications আছে কিনা চেক ──
-- (0016 run করলে notifications + posts দেখাবে)
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename in ('notifications', 'posts');

-- ── ধাপ ২: তোমার uid বের করি (অ্যাপে login করা account) ──
-- নিচের ফলাফল থেকে তোমার (MD. MOZAHIDUL ISLAM) id টা দেখো।
select id, name, email from public.users order by created_at desc limit 5;

-- ============================================================
-- ধাপ ৩: তোমার account-এ একটা TEST notification বসাই।
--
-- ⚠️ নিচের <<<YOUR_UID>>> জায়গায় ধাপ ২-এর তোমার id টা বসাও (দুই জায়গায়),
--    তারপর এই অংশটা select করে Run করো।
--    অ্যাপে Home খোলা থাকলে bell-এ সাথে সাথে (real-time) দেখা উচিত।
-- ============================================================

begin;
set local session_replication_role = 'replica';   -- FK trigger বন্ধ (test)

insert into public.notifications (to_user_id, from_user_id, type, message, data, read)
values (
  '889322c9-5a96-4e93-89e6-de13530a00ff',   -- তোমার id (প্রাপক)
  '889322c9-5a96-4e93-89e6-de13530a00ff',   -- from (test-এ নিজেই)
  'post_joined',
  '👋 Test User wants to join your ride to Kuril',
  '{"postId":"test","destination":"Kuril"}'::jsonb,
  false
);

commit;


-- ── ধাপ ৪ (টেস্ট শেষে cleanup) ──
-- delete from public.notifications where message like '%Test User%';
