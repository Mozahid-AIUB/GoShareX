-- ============================================================
-- GoShareX — Supabase initial schema (DRAFT for review)
-- Firebase Firestore collections -> PostgreSQL tables
--
-- এই ফাইলটা এখনো Supabase-এ চালানো হয়নি — শুধু নকশা।
-- প্রতিটা টেবিলের পাশে বাংলা মন্তব্যে বোঝানো আছে কেন এমন।
-- ============================================================

-- ------------------------------------------------------------
-- 1. users
-- Firebase: users/{uid}  ->  এখানে id = Supabase Auth user-এর id
-- ------------------------------------------------------------
create table public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  -- ^ Supabase Auth-এর সাথে জোড়া: auth ইউজার মুছলে এই row-ও মুছবে
  email           text not null unique,
  name            text not null,
  student_id      text not null,
  department      text,
  phone_number    text,
  photo_url       text,
  rating          numeric(2,1) not null default 5.0,   -- 0.0 - 5.0
  total_rides     integer      not null default 0,
  total_saved     numeric      not null default 0,
  completion_rate numeric      not null default 100,
  badge           text         not null default 'new',
  strikes         integer      not null default 0,
  is_suspended    boolean      not null default false,
  suspended_until timestamptz,                          -- Firebase Timestamp -> timestamptz
  created_at      timestamptz  not null default now(),
  last_active     timestamptz
);

-- ------------------------------------------------------------
-- 2. rides
-- Firebase: rides/{rideId}
-- rider1/rider2 এখন আসল users.id হতে বাধ্য (foreign key = control)
-- ------------------------------------------------------------
create table public.rides (
  id             uuid primary key default gen_random_uuid(),
  rider1         uuid not null references public.users (id),
  rider2         uuid not null references public.users (id),
  destination    text not null,
  pickup_point   text not null,
  fare           numeric not null,
  split_amount   numeric not null,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','active','completed','cancelled')),
  -- ^ check = ভুল status (যেমন "done") কখনো ঢুকতে পারবে না
  confirmed_at   timestamptz,
  started_at     timestamptz,
  completed_at   timestamptz,
  cancelled_at   timestamptz,
  cancel_reason  text,
  rider1_rating  integer check (rider1_rating between 1 and 5),
  rider2_rating  integer check (rider2_rating between 1 and 5),
  rider1_feedback text,
  rider2_feedback text,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. chats
-- Firebase: chats/{chatId}  (participants ছিল array)
-- ------------------------------------------------------------
create table public.chats (
  id           uuid primary key default gen_random_uuid(),
  ride_id      uuid references public.rides (id) on delete set null,
  participants uuid[] not null,        -- ইউজার id-র array
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. messages
-- Firebase: chats/{chatId}/messages/{messageId}  (subcollection)
-- SQL-এ subcollection হয় না -> আলাদা টেবিল + chat_id দিয়ে জোড়া
-- ------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  sender_id  uuid not null references public.users (id),
  text       text not null check (char_length(text) <= 1000),
  type       text not null default 'text'
             check (type in ('text','location','quick_reply')),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. posts
-- Firebase: posts/{postId}  (24h expiry)
-- ------------------------------------------------------------
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.users (id) on delete cascade,
  destination    text not null,
  pickup_point   text not null,
  scheduled_time timestamptz,           -- 'now' হলে এখনকার সময়, নাহলে নির্দিষ্ট সময়
  note           text,
  status         text not null default 'open'
                 check (status in ('open','matched','expired','cancelled')),
  interested     uuid[] not null default '{}',
  max_riders     integer not null default 2,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

-- ------------------------------------------------------------
-- 6. fare_table  (read-only pricing lookup)
-- ------------------------------------------------------------
create table public.fare_table (
  id          uuid primary key default gen_random_uuid(),
  destination text not null unique,
  base_fare   numeric not null
);

-- ------------------------------------------------------------
-- 7. reports  (write-only from client)
-- ------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.users (id),
  reported_id  uuid not null references public.users (id),
  ride_id      uuid references public.rides (id) on delete set null,
  reason       text not null,
  details      text,
  created_at   timestamptz not null default now()
);

-- NOTE: active_riders (live presence) ইচ্ছাকৃতভাবে এখানে নেই।
-- ওটা real-time presence — পরে Supabase Realtime দিয়ে আলাদাভাবে করব (ধাপ ৫)।
