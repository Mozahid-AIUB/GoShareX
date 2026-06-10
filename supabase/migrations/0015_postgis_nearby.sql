-- ============================================================
-- ধাপ ৫+ (enterprise matching): PostGIS দিয়ে server-side nearby query
--
-- সমস্যা: এখন subscribeToNearbyRiders পুরো active_riders টেবিল client-এ টেনে
-- এনে haversine filter করে — O(n)। ঢাকায় হাজার-লক্ষ active rider হলে প্রতিবার
-- পুরো টেবিল ডাউনলোড = ধীর, দামি, battery খরচ। Uber/Pathao এভাবে করে না।
--
-- সমাধান (enterprise): PostGIS geography + GiST index + ST_DWithin।
-- server শুধু radius-এর ভিতরের rider দেয়, distance সহ — মিলিসেকেন্ডে, scale-এ।
-- distance server একবার হিসাব করে → Map ও Home একই সংখ্যা পায় (consistency)।
-- ============================================================

-- ১) PostGIS extension (Supabase-এ আছে, শুধু enable)
create extension if not exists postgis;

-- ২) active_riders-এ geography(Point) column — lat/lng থেকে auto-generated।
--    আলাদা করে লেখার দরকার নেই; lat/lng লিখলেই geo আপডেট হয়।
alter table public.active_riders
  add column if not exists geo geography(Point, 4326)
  generated always as (
    case
      when lat is not null and lng is not null
      then ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    end
  ) stored;

-- ৩) GiST index — geo query দ্রুত করে (এটাই scale-এর চাবি)
create index if not exists idx_active_riders_geo on public.active_riders using gist (geo);

-- dest-এর geo-ও (same-destination match server-side করতে)
alter table public.active_riders
  add column if not exists dest_geo geography(Point, 4326)
  generated always as (
    case
      when dest_lat is not null and dest_lng is not null
        and not (dest_lat = 0 and dest_lng = 0)   -- 0,0 = GPS fail, বাদ
      then ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)::geography
    end
  ) stored;

-- ৪) nearby_riders RPC — enterprise heart।
--    caller-এর অবস্থান + গন্তব্য + radius দিলে, কাছের rider + distance +
--    isMatch (গন্তব্য ≤ same_dest_m) ফেরত। নিজেকে + riding বাদ।
create or replace function public.nearby_riders(
  p_lat        double precision,
  p_lng        double precision,
  p_dest_lat   double precision default null,
  p_dest_lng   double precision default null,
  p_radius_m   double precision default 1000,    -- visible radius (map কখনো খালি না)
  p_same_dest_m double precision default 500      -- একই গন্তব্য সীমা
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
  distance_m   double precision,   -- server-হিসাবকৃত (Map=Home একই)
  is_match     boolean             -- জোন না, শুধু গন্তব্য মেলে কিনা (zone client-এ)
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography as g,
      case when p_dest_lat is not null and p_dest_lng is not null
             and not (p_dest_lat = 0 and p_dest_lng = 0)
           then ST_SetSRID(ST_MakePoint(p_dest_lng, p_dest_lat), 4326)::geography
      end as dg
  )
  select
    r.user_id, r.name, r.lat, r.lng, r.destination,
    r.dest_lat, r.dest_lng, r.pickup_point, r.status,
    r.rating, r.badge, r.photo_url,
    -- distance 5m bucket-এ round — GPS micro-movement-এ flicker বন্ধ, আর
    -- server-এ round হওয়ায় Map ও Home হুবহু একই সংখ্যা দেখায় (consistency)।
    (round(ST_Distance(r.geo, me.g) / 5.0) * 5)::double precision as distance_m,
    -- match = দুজনের dest_geo দুটোই valid AND ≤ same_dest_m
    (me.dg is not null and r.dest_geo is not null
      and ST_DWithin(r.dest_geo, me.dg, p_same_dest_m)) as is_match
  from public.active_riders r, me
  where r.geo is not null
    and r.status <> 'riding'
    and ST_DWithin(r.geo, me.g, p_radius_m)   -- ← GiST index এখানে কাজ করে
  order by distance_m asc;
$$;
