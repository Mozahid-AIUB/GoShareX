-- ============================================================
-- ধাপ: Smart Matching (premium) — দিক/পথ-সচেতন match score
--
-- আগে: is_match = শুধু "দুজনের গন্তব্য ≤500m" (হ্যাঁ/না)। Home-এ একটা
-- match% দেখানো হতো কিন্তু সেটা client-এ শুধু "কত কাছে + rating + একই pickup"
-- দিয়ে হিসাব হতো — কেউ আসলে *একই দিকে* যাচ্ছে কিনা তা জানত না।
--
-- এখন: server (PostGIS) আসল geometry দিয়ে হিসাব করে — কোনো Google API লাগে
-- না (তাই billing বন্ধ থাকলেও কাজ করে)। প্রতিটা rider-এর জন্য বের করি:
--   • dest_gap_m        — দুজনের গন্তব্য কত দূরে (মিটার)
--   • heading_diff_deg  — আমার চলার দিক vs তার চলার দিক (0–180°; ছোট = একই দিক)
--   • corridor_m        — সে এখন আমার সোজা পথ (আমি→গন্তব্য) থেকে কত দূরে
--   • match_score 0–100 — উপরের সব মিলিয়ে "shared ride কতটা ভালো"
--
-- is_match (গন্তব্য ≤500m) আগের মতোই রাখা — পুরোনো UI ভাঙে না; match_score
-- শুধু নতুন (ranking + "৯২% মিল" দেখাতে)। order এখন best-match আগে।
-- ============================================================

-- return type বদলাচ্ছে (নতুন column) → আগে DROP লাগবে (replace যথেষ্ট না)।
drop function if exists public.nearby_riders(
  double precision, double precision, double precision,
  double precision, double precision, double precision
);

create or replace function public.nearby_riders(
  p_lat        double precision,
  p_lng        double precision,
  p_dest_lat   double precision default null,
  p_dest_lng   double precision default null,
  p_radius_m   double precision default 1000,
  p_same_dest_m double precision default 500
)
returns table (
  user_id      uuid,
  name         text,
  lat          double precision,
  lng          double precision,
  destination  text,
  dest_lat     double precision,
  dest_lng     double precision,
  pickup_point text,
  status       text,
  rating        numeric,
  badge        text,
  photo_url    text,
  vehicle_type text,
  distance_m   double precision,
  is_match     boolean,
  dest_gap_m       double precision,   -- দুই গন্তব্যের দূরত্ব
  heading_diff_deg double precision,   -- চলার দিকের পার্থক্য (0–180°)
  corridor_m       double precision,   -- আমার পথ থেকে তার দূরত্ব
  match_score      double precision    -- 0–100 (premium smart score)
)
language sql
stable
security definer
set search_path = public
as $$
  -- ১) আমি: অবস্থান g, গন্তব্য dg, পথ path (g→dg লাইন), চলার দিক bearing।
  with me as (
    select
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography as g,
      case when p_dest_lat is not null and p_dest_lng is not null
             and not (p_dest_lat = 0 and p_dest_lng = 0)
           then ST_SetSRID(ST_MakePoint(p_dest_lng, p_dest_lat), 4326)::geography
      end as dg
  ),
  me2 as (
    select
      g, dg,
      case when dg is not null and not ST_Equals(g::geometry, dg::geometry)
           then ST_MakeLine(g::geometry, dg::geometry)::geography
      end as path,
      case when dg is not null and not ST_Equals(g::geometry, dg::geometry)
           then degrees(ST_Azimuth(g, dg))
      end as bearing
    from me
  ),
  -- ২) প্রতিটা কাছের rider-এর কাঁচা signal হিসাব।
  base as (
    select
      r.user_id, r.name, r.lat, r.lng, r.destination,
      r.dest_lat, r.dest_lng, r.pickup_point, r.status,
      r.rating, r.badge, r.photo_url, r.vehicle_type,
      (round(ST_Distance(r.geo, m.g) / 5.0) * 5)::double precision as distance_m,
      (m.dg is not null and r.dest_geo is not null
        and ST_DWithin(r.dest_geo, m.dg, p_same_dest_m)) as is_match,
      case when m.dg is not null and r.dest_geo is not null
           then ST_Distance(r.dest_geo, m.dg) end as dest_gap_m,
      case when m.path is not null
           then ST_Distance(r.geo, m.path) end as corridor_m,
      -- তার চলার দিক (অবস্থান→গন্তব্য) বনাম আমার দিক, 0–180° এ আনা।
      case when m.bearing is not null and r.dest_geo is not null
                and not ST_Equals(r.geo::geometry, r.dest_geo::geometry)
           then abs(
                  ( ( (degrees(ST_Azimuth(r.geo, r.dest_geo)) - m.bearing + 180)::numeric
                      % 360 + 360 ) % 360 ) - 180
                )::double precision
      end as heading_diff_deg
    from public.active_riders r, me2 m
    where r.geo is not null
      and r.status <> 'riding'
      and ST_DWithin(r.geo, m.g, p_radius_m)   -- ← GiST index এখানে কাজ করে
  )
  -- ৩) signal গুলো ওজন দিয়ে মিলিয়ে 0–100 score।
  --    গন্তব্য মিল 40% · একই দিক 25% · আমার পথে 20% · এখন কাছে 15%।
  --    দিক/পথ অজানা হলে neutral 0.5 ধরি; গন্তব্য অজানা হলে 0 (দাবি করা যায় না)।
  select
    user_id, name, lat, lng, destination, dest_lat, dest_lng, pickup_point,
    status, rating, badge, photo_url, vehicle_type,
    distance_m, is_match, dest_gap_m, heading_diff_deg, corridor_m,
    greatest(0, least(100, round(100 * (
        0.40 * coalesce(greatest(0, 1 - dest_gap_m / (p_same_dest_m * 2.0)), 0)
      + 0.25 * coalesce(greatest(0, 1 - heading_diff_deg / 90.0), 0.5)
      + 0.20 * coalesce(greatest(0, 1 - corridor_m / p_radius_m), 0.5)
      + 0.15 * greatest(0, 1 - distance_m / p_radius_m)
    )::numeric)))::double precision as match_score
  from base
  order by is_match desc, match_score desc nulls last, distance_m asc;
$$;
