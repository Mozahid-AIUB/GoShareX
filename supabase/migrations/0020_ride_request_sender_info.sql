-- ============================================================
-- ride_requests-এ sender-এর info — banner-এ premium card দেখাতে
-- (avatar/vehicle, rating, badge)। distance receiver client-এ হিসাব করে।
-- ============================================================

alter table public.ride_requests
  add column if not exists from_rating  numeric,
  add column if not exists from_badge    text,
  add column if not exists from_vehicle  text,
  -- sender-এর অবস্থান (receiver distance হিসাব করতে)
  add column if not exists from_lat       double precision,
  add column if not exists from_lng       double precision;
