-- ============================================================
-- ধাপ ৫ (chat): Schema v2 — full chat system
--
-- Firebase chatService-এর সব feature support করতে chats/messages
-- টেবিলে নতুন কলাম যোগ করি। তিন mode:
--   'ride'             — match হওয়া দুজন পরিচিত, deal confirm, 10 min
--   'anonymous_1v1'    — random stranger 1v1, alias, 5 min
--   'anonymous_group'  — random group (2-10), alias, 10 min
--
-- নিরাপদ ও idempotent: 'add column if not exists' ব্যবহার, যাতে
-- বারবার চালালেও ভাঙে না।
-- ============================================================

-- ------------------------------------------------------------
-- chats টেবিলে advanced কলাম
-- ------------------------------------------------------------
alter table public.chats
  add column if not exists mode text not null default 'ride'
    check (mode in ('ride','anonymous_1v1','anonymous_group')),
  add column if not exists anonymous boolean not null default false,
  add column if not exists destination text,
  add column if not exists fare numeric default 0,
  -- alias: anonymous chat-এ uid -> "Anonymous 1" ম্যাপ (পরিচয় গোপন)
  add column if not exists participant_names jsonb not null default '{}'::jsonb,
  add column if not exists participant_aliases jsonb not null default '{}'::jsonb,
  -- matching state: কেউ join-এর অপেক্ষায় কিনা
  add column if not exists searching boolean not null default false,
  add column if not exists min_participants integer default 2,
  add column if not exists max_participants integer default 2,
  -- expiry / lifecycle
  add column if not exists expires_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.users (id),
  -- deal confirmation: uid -> bool (দুজনেই confirm করলে deal পাকা)
  add column if not exists deal_confirmed jsonb not null default '{}'::jsonb,
  -- read receipts: uid -> last-read epoch ms
  add column if not exists last_read jsonb not null default '{}'::jsonb,
  -- typing indicator: uid -> { alias, at } বা null
  add column if not exists typing jsonb not null default '{}'::jsonb,
  -- last message preview (তালিকায় দেখাতে)
  add column if not exists last_message text,
  add column if not exists last_message_time timestamptz;

-- ------------------------------------------------------------
-- messages টেবিল — sender_name + 'system' type যোগ
-- ------------------------------------------------------------
alter table public.messages
  add column if not exists sender_name text;

-- পুরনো type check (text/location/quick_reply) বদলে 'system','deal_confirm' যোগ
alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages
  add constraint messages_type_check
  check (type in ('text','location','quick_reply','system','deal_confirm'));

-- system message-এ sender_id null হতে পারে (anonymous), তাই nullable করি
alter table public.messages alter column sender_id drop not null;

-- ------------------------------------------------------------
-- index — দ্রুত matching ও lookup
-- ------------------------------------------------------------
-- anonymous matching: mode + searching দিয়ে waiting room খোঁজা
create index if not exists idx_chats_matching
  on public.chats (mode, searching, expires_at);
-- participant দিয়ে chat খোঁজা (uuid[] participants-এ GIN index)
create index if not exists idx_chats_participants
  on public.chats using gin (participants);
-- expiry cleanup-এর জন্য
create index if not exists idx_chats_expires
  on public.chats (expires_at);
