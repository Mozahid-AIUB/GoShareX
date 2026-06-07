-- ============================================================
-- ধাপ ৩: নিরাপত্তা trigger + বাকি টেবিল
-- ============================================================

-- ------------------------------------------------------------
-- ভাগ ১: users টেবিলে cheat-ঠেকানো trigger
-- Firebase isValidUpdate() এর সমতুল্য:
-- ইউজার নিজে rating/strikes/total_rides/badge/is_suspended/
-- suspended_until/completion_rate/total_saved বদলাতে পারবে না।
-- যদি চেষ্টা করে, পুরনো মানটাই জোর করে রেখে দেওয়া হবে।
-- (শুধু server = security definer function এগুলো বদলাতে পারবে)
-- ------------------------------------------------------------
create or replace function public.protect_user_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- যদি বর্তমান কাজটা একটা security-definer server function থেকে আসে,
  -- তবে সব বদলাতে দাও। client (anon/authenticated) হলে সুরক্ষিত কলাম আটকে দাও।
  if current_setting('role', true) is distinct from 'service_role'
     and auth.uid() = new.id then
    new.rating          := old.rating;
    new.strikes         := old.strikes;
    new.total_rides     := old.total_rides;
    new.total_saved     := old.total_saved;
    new.completion_rate := old.completion_rate;
    new.badge           := old.badge;
    new.is_suspended    := old.is_suspended;
    new.suspended_until := old.suspended_until;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_fields on public.users;
create trigger trg_protect_user_fields
  before update on public.users
  for each row execute function public.protect_user_fields();

-- ============================================================
-- ভাগ ২: বাকি টেবিল
-- ============================================================

-- ------------------------------------------------------------
-- ratings  (Firebase: ratings collection)
-- raterId, stars 1-5, একবার দিলে আর বদলানো/মোছা যায় না
-- ------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  rater_id   uuid not null references public.users (id),
  rated_id   uuid not null references public.users (id),
  ride_id    uuid references public.rides (id) on delete set null,
  stars      integer not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);
alter table public.ratings enable row level security;

create policy "ratings: rater can read own"
  on public.ratings for select
  using (auth.uid() = rater_id);

create policy "ratings: rater can create"
  on public.ratings for insert
  with check (public.is_not_suspended() and rater_id = auth.uid());
-- update/delete: কোনো policy নেই = নিষেধ (Firebase: allow update, delete false)

-- ------------------------------------------------------------
-- notifications  (Firebase: notifications collection)
-- to_user_id, from_user_id, message <=500, read flag
-- ------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  to_user_id   uuid not null references public.users (id) on delete cascade,
  from_user_id uuid references public.users (id) on delete set null,
  type         text,
  message      text not null check (char_length(message) between 1 and 500),
  data         jsonb,                 -- rideId, screen ইত্যাদি এখানে
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table public.notifications enable row level security;

create policy "notifications: recipient/sender can read"
  on public.notifications for select
  using (auth.uid() = to_user_id or auth.uid() = from_user_id);

create policy "notifications: sender can create"
  on public.notifications for insert
  with check (auth.uid() = from_user_id and read = false);

-- শুধু read flag বদলানো যাবে, তাও শুধু প্রাপক (recipient)
create policy "notifications: recipient marks read"
  on public.notifications for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

create policy "notifications: recipient can delete"
  on public.notifications for delete
  using (auth.uid() = to_user_id);

-- ------------------------------------------------------------
-- active_riders  (live presence)
-- Firebase RTDB-তে ছিল; এখন PostgreSQL টেবিল + পরে Realtime (ধাপ ৫)
-- ------------------------------------------------------------
create table public.active_riders (
  user_id      uuid primary key references public.users (id) on delete cascade,
  name         text not null,
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  destination  text,
  pickup_point text,
  status       text not null default 'waiting'
               check (status in ('waiting','matched','in_ride')),
  rating       numeric(2,1),
  badge        text,
  photo_url    text,
  updated_at   timestamptz not null default now()
);
alter table public.active_riders enable row level security;

create policy "active_riders: authenticated can read"
  on public.active_riders for select
  using (public.is_not_suspended() and auth.uid() is not null);

-- নিজে শুধু নিজের presence লিখতে/বদলাতে/মুছতে পারবে
create policy "active_riders: own write"
  on public.active_riders for insert
  with check (public.is_not_suspended() and auth.uid() = user_id);

create policy "active_riders: own update"
  on public.active_riders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "active_riders: own delete"
  on public.active_riders for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- দ্রুত query-র জন্য কিছু index (বড় হলে গতি বাড়াবে)
-- ------------------------------------------------------------
create index idx_rides_rider1     on public.rides (rider1);
create index idx_rides_rider2     on public.rides (rider2);
create index idx_messages_chat    on public.messages (chat_id, created_at);
create index idx_posts_status     on public.posts (status, expires_at);
create index idx_notif_to_user    on public.notifications (to_user_id, read);
