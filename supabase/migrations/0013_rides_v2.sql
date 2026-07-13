-- ============================================================
-- ধাপ ৫ (ride flow): rides টেবিলে ride-service ক্ষেত্র যোগ
--
-- Firebase rideService Ride-এ rider নাম, ready ফ্ল্যাগ, routePreview,
-- cancelledBy আছে — কিন্তু আমাদের rides টেবিলে (0001) এগুলো নেই।
-- যোগ করি। idempotent।
-- ============================================================

alter table public.rides
  add column if not exists rider1_name   text,
  add column if not exists rider2_name   text,
  add column if not exists rider1_ready  boolean not null default false,
  add column if not exists rider2_ready  boolean not null default false,
  add column if not exists route_preview jsonb,
  add column if not exists cancelled_by  uuid references public.users (id);
