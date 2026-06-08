-- ============================================================
-- ধাপ ৫ (chat): blocked_aliases টেবিল + chat RLS (security)
--
-- chats/messages টেবিলে RLS আগে 0002-এ বসানো ছিল (participant-based)।
-- এখানে: (1) block টেবিল, (2) anonymous matching-এর জন্য RLS সমন্বয়।
--
-- নিরাপত্তা নীতি:
--   - chat পড়া/লেখা শুধু participant। searching room-ও পড়া যায়
--     (matching-এর সময় দরকার)।
--   - matching/join নিজে participants বদলানো client করে না — RPC
--     (security definer) করে। তাই client-side participants বদলানো
--     RLS-এ আটকানোই থাকে (শুধু নিজের typing/lastRead/deal বদলাতে পারে)।
-- ============================================================

-- ------------------------------------------------------------
-- blocked_aliases — কে কাকে block করেছে
-- ------------------------------------------------------------
create table if not exists public.blocked_aliases (
  id            uuid primary key default gen_random_uuid(),
  blocker_id    uuid not null references public.users (id) on delete cascade,
  chat_id       uuid not null references public.chats (id) on delete cascade,
  blocked_alias text not null,
  created_at    timestamptz not null default now(),
  unique (blocker_id, chat_id, blocked_alias)
);
alter table public.blocked_aliases enable row level security;

create policy "blocked: owner can read"
  on public.blocked_aliases for select
  using (auth.uid() = blocker_id);

create policy "blocked: owner can insert"
  on public.blocked_aliases for insert
  with check (auth.uid() = blocker_id);

create policy "blocked: owner can delete"
  on public.blocked_aliases for delete
  using (auth.uid() = blocker_id);

-- ------------------------------------------------------------
-- chats RLS সমন্বয় (0002-এর policy গুলো বদলাই/যোগ করি)
-- anonymous matching-এর জন্য searching room পড়া দরকার।
-- ------------------------------------------------------------
drop policy if exists "chats: participant can read" on public.chats;
create policy "chats: participant or searching can read"
  on public.chats for select
  using (
    auth.uid() = any(participants)
    or (anonymous = true and searching = true)   -- matching-এর সময় waiting room দেখা
  );

-- participant নিজের row আপডেট করতে পারে (typing/lastRead/deal/leave)।
-- (participants array বদল মূলত RPC করে — security definer, RLS বাইপাস।)
drop policy if exists "chats: participant can update" on public.chats;
create policy "chats: participant can update"
  on public.chats for update
  using (auth.uid() = any(participants))
  with check (auth.uid() = any(participants));

-- ------------------------------------------------------------
-- messages RLS — শুধু chat participant পড়তে/লিখতে পারে
-- (0002-এ ছিল; anonymous group-এও participant চেক একই কাজ করে)
-- ------------------------------------------------------------
-- (messages policy 0002-এ আছে — chat_id দিয়ে participant চেক।
--  system message RPC/security-definer insert করে, তাই client policy
--  শুধু নিজের পাঠানো message-এ প্রযোজ্য।)
