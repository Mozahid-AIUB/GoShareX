-- ============================================================
-- ধাপ ৫ (post board): posts টেবিলে denormalized author info + ক্ষেত্র
--
-- Firebase Post-এ author নাম/rating/badge/photo সরাসরি রাখা থাকে
-- (denormalized — তালিকায় দ্রুত দেখাতে, প্রতিবার join লাগে না)।
-- meet_point/meet_time/ride_type-ও যোগ করি। idempotent।
-- ============================================================

alter table public.posts
  add column if not exists author_name   text,
  add column if not exists author_rating numeric default 5,
  add column if not exists author_badge  text,
  add column if not exists author_photo_url text,
  add column if not exists meet_point    text,
  add column if not exists meet_time     text,
  add column if not exists ride_type     text default 'share',
  add column if not exists note          text;

-- পুরনো scheduled_time timestamptz ছিল; অ্যাপ string ('now' বা সময়)
-- পাঠায় — text কলাম যোগ করি যাতে মিল থাকে।
alter table public.posts
  add column if not exists scheduled_time_text text;
