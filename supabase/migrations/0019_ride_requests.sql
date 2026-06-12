-- ============================================================
-- ride_requests — "Request → accept → chat" flow।
--
-- A কাউকে request করলে এখানে একটা row (pending)। B realtime দেখে, accept
-- করলে chat তৈরি হয় (chat_id সেট), দুজনেই chat-এ ঢোকে। decline করলে শেষ।
--
-- আগে Home-এর "Request" শুধু local state ছিল (অন্যজন জানতই না)। এটা সেটাকে
-- সত্যিকারের two-sided handshake বানায়।
-- ============================================================

create table if not exists public.ride_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user     uuid not null references public.users (id) on delete cascade,
  to_user       uuid not null references public.users (id) on delete cascade,
  from_name     text not null,
  destination   text not null,
  dest_lat      double precision,
  dest_lng      double precision,
  fare          numeric default 0,
  status        text not null default 'pending'
                check (status in ('pending','accepted','declined','cancelled','expired')),
  chat_id       uuid references public.chats (id) on delete set null,  -- accept হলে সেট
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);

-- একই pair-এ একটাই PENDING request (partial unique — accepted/declined বাদ)।
create unique index if not exists uq_pending_request
  on public.ride_requests (from_user, to_user)
  where status = 'pending';

alter table public.ride_requests enable row level security;

-- পড়া: পাঠানো বা প্রাপ্ত — দুজনেই দেখতে পারে
create policy "ride_requests: sender or receiver reads"
  on public.ride_requests for select
  using (auth.uid() = from_user or auth.uid() = to_user);

-- তৈরি: নিজে from_user হয়ে, pending হিসেবে
create policy "ride_requests: sender creates pending"
  on public.ride_requests for insert
  with check (auth.uid() = from_user and status = 'pending');

-- আপডেট: receiver accept/decline করতে পারে; sender নিজেরটা cancel করতে পারে
create policy "ride_requests: receiver responds"
  on public.ride_requests for update
  using (auth.uid() = to_user or auth.uid() = from_user)
  with check (auth.uid() = to_user or auth.uid() = from_user);

create policy "ride_requests: either can delete"
  on public.ride_requests for delete
  using (auth.uid() = from_user or auth.uid() = to_user);

-- দ্রুত query (B-এর incoming pending, A-এর outgoing)
create index if not exists idx_ride_requests_to   on public.ride_requests (to_user, status);
create index if not exists idx_ride_requests_from on public.ride_requests (from_user, status);

-- realtime — Home banner live update
do $$
begin
  begin
    alter publication supabase_realtime add table public.ride_requests;
  exception when duplicate_object then null;
  end;
end $$;
