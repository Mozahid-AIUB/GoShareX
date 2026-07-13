-- ============================================================
-- GoShareX — Row Level Security (RLS)
-- firestore.rules এর হুবহু সমতুল্য, PostgreSQL-এ
--
-- Firebase  request.auth.uid   ->  Supabase  auth.uid()
-- ============================================================

-- ------------------------------------------------------------
-- প্রথমে: helper function — isNotSuspended()
-- Firebase: user.isSuspended false হতে হবে, অথবা suspend সময় পার
-- ------------------------------------------------------------
create or replace function public.is_not_suspended()
returns boolean
language sql
security definer          -- নিজের users row পড়তে RLS বাইপাস করবে (নাহলে অসীম লুপ)
set search_path = public
as $$
  select coalesce(
    (select (not is_suspended) or (suspended_until < now())
       from public.users where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- সব টেবিলে RLS চালু করি (এটা না করলে নিয়ম কাজ করবে না)
-- ============================================================
alter table public.users      enable row level security;
alter table public.rides      enable row level security;
alter table public.chats      enable row level security;
alter table public.messages   enable row level security;
alter table public.posts      enable row level security;
alter table public.fare_table enable row level security;
alter table public.reports    enable row level security;

-- ============================================================
-- 1. users
-- Firebase: read/update শুধু নিজের; delete নিষেধ;
--           rating/strikes/badge ইত্যাদি ইউজার বদলাতে পারবে না
-- ============================================================
-- NOTE: আসল Firebase rule-এ read শুধু নিজের (isOwner) ছিল।
-- কিন্তু ride-match করতে অন্যের নাম/rating দরকার হয় —
-- তাই এখানে সব-auth-read রাখলাম। (আপনি চাইলে কড়া করা যাবে)
create policy "users: read for authenticated"
  on public.users for select
  using (auth.uid() is not null);

create policy "users: insert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users: update own row only"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- ^ rating/strikes/badge রক্ষা: এগুলো শুধু server (security definer
--   function/Edge Function) বদলাবে — সেটা ধাপ ৬-এ। আপাতত client থেকে
--   ওই কলাম বদলানো ঠেকাতে পরে একটা trigger যোগ করব।

-- delete: কোনো policy নেই = কেউ delete করতে পারবে না (Firebase: allow delete false)

-- ============================================================
-- 2. rides
-- Firebase: read/update শুধু participant; create নিজে rider1 হলে;
--           delete নিষেধ; suspend হলে নিষেধ
-- ============================================================
create policy "rides: participant can read"
  on public.rides for select
  using (public.is_not_suspended() and (auth.uid() = rider1 or auth.uid() = rider2));

create policy "rides: rider1 can create"
  on public.rides for insert
  with check (public.is_not_suspended() and auth.uid() = rider1);

create policy "rides: participant can update"
  on public.rides for update
  using (public.is_not_suspended() and (auth.uid() = rider1 or auth.uid() = rider2));

-- ============================================================
-- 3. chats  (participants uuid[] array)
-- Firebase: read/update participant; create নিজে participant-এ থাকলে
-- = ANY(participants) মানে "আমার id কি array-তে আছে?"
-- ============================================================
create policy "chats: participant can read"
  on public.chats for select
  using (public.is_not_suspended() and auth.uid() = any(participants));

create policy "chats: create if self in participants"
  on public.chats for insert
  with check (public.is_not_suspended() and auth.uid() = any(participants));

create policy "chats: participant can update"
  on public.chats for update
  using (public.is_not_suspended() and auth.uid() = any(participants));

create policy "chats: participant can delete"
  on public.chats for delete
  using (auth.uid() = any(participants));

-- ============================================================
-- 4. messages
-- Firebase: শুধু chat-এর participant; sender নিজে হতে হবে;
--           text 1-1000 char
-- ============================================================
create policy "messages: chat participant can read"
  on public.messages for select
  using (
    public.is_not_suspended()
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and auth.uid() = any(c.participants)
    )
  );

create policy "messages: participant sends own message"
  on public.messages for insert
  with check (
    public.is_not_suspended()
    and sender_id = auth.uid()
    and char_length(text) between 1 and 1000
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and auth.uid() = any(c.participants)
    )
  );

-- ============================================================
-- 5. posts
-- Firebase: সবাই read; author নিজে create/update/delete
-- ============================================================
create policy "posts: read for authenticated"
  on public.posts for select
  using (public.is_not_suspended() and auth.uid() is not null);

create policy "posts: author can create"
  on public.posts for insert
  with check (public.is_not_suspended() and auth.uid() = author_id);

create policy "posts: author can update"
  on public.posts for update
  using (public.is_not_suspended() and auth.uid() = author_id);

create policy "posts: author can delete"
  on public.posts for delete
  using (auth.uid() = author_id);

-- ============================================================
-- 6. fare_table
-- Firebase: সবাই read; write নিষেধ (শুধু server seed করবে)
-- ============================================================
create policy "fare_table: read for authenticated"
  on public.fare_table for select
  using (auth.uid() is not null);

-- write: কোনো policy নেই = client থেকে লেখা যাবে না

-- ============================================================
-- 7. reports
-- Firebase: create only (reporter নিজে); read/update/delete নিষেধ
-- ============================================================
create policy "reports: reporter can create"
  on public.reports for insert
  with check (
    public.is_not_suspended()
    and reporter_id = auth.uid()
    and char_length(reason) > 10
  );

-- read/update/delete: কোনো policy নেই = client পড়তে/বদলাতে পারবে না
