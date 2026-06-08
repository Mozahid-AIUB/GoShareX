-- ============================================================
-- ধাপ ৫ (rating/profile): ratings category + trust breakdown
--
-- Firebase rating-এ friendly/safeRide category + trust score formula
-- আছে; users-এ trustBreakdown জমা হয়। সেগুলো যোগ করি। idempotent।
-- ============================================================

-- ratings টেবিলে category + ratee যোগ
-- (0003-এ ratings ছিল: rater_id, rated_id, ride_id, stars, comment)
alter table public.ratings
  add column if not exists friendly  boolean default false,
  add column if not exists safe_ride boolean default false;

-- এক ইউজার এক ride-এ একবারই rate করতে পারবে (rideId_raterId এর সমতুল্য)
do $$
begin
  alter table public.ratings add constraint ratings_one_per_ride_per_rater
    unique (ride_id, rater_id);
exception when duplicate_table then null;
            when duplicate_object then null;
end $$;

-- users টেবিলে trust breakdown + totalRatings
alter table public.users
  add column if not exists trust_score    integer default 100,
  add column if not exists total_ratings  integer default 0,
  add column if not exists trust_breakdown jsonb;

-- rides টেবিলে "এই rater rate করেছে" ফ্ল্যাগ (rated_<uid> এর সমতুল্য)
-- jsonb দিয়ে: rated = { "<uid>": true }
alter table public.rides
  add column if not exists rated jsonb not null default '{}'::jsonb;
