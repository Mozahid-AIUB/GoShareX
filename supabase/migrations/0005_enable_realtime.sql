-- ============================================================
-- ধাপ ৫: Realtime enable করা
--
-- Supabase Realtime ডিফল্টে বন্ধ। যে টেবিলের পরিবর্তন client-এ
-- real-time-এ পাঠাতে চাই, সেটাকে supabase_realtime publication-এ
-- যোগ করতে হয়। (PostgreSQL logical replication-এর উপর ভিত্তি করে।)
-- ============================================================

-- chat messages — নতুন/আপডেট হলে সাথে সাথে দুই participant-এ পৌঁছাবে
alter publication supabase_realtime add table public.messages;

-- chats — তালিকা/lastMessage আপডেট real-time-এ
alter publication supabase_realtime add table public.chats;

-- active_riders — live presence (ধাপ ৫-এর পরের অংশে লাগবে)
alter publication supabase_realtime add table public.active_riders;

-- rides — ride status real-time আপডেট (useRideStatus পরে এতে আসবে)
alter publication supabase_realtime add table public.rides;
