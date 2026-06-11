-- ============================================================
-- active_riders-এ vehicle_type কলাম — rider কোন বাহন (rickshaw/cng/bike)
-- দিয়ে যাচ্ছে তা presence-এ রাখি, যাতে Map ও Home-এ সঠিক vehicle icon
-- দেখানো যায় (আগে সব rickshaw ধরা হতো)।
--
-- পাশাপাশি nearby_riders RPC-কে vehicle_type ফেরত দিতে আপডেট করি।
-- ============================================================

alter table public.active_riders
  add column if not exists vehicle_type text
  check (vehicle_type in ('rickshaw', 'cng', 'bike'));

-- nearby_riders RPC re-create — vehicle_type যোগ (বাকি সব আগের মতো)।
-- ⚠️ return type বদলাচ্ছে (নতুন column), তাই create-or-replace যথেষ্ট না —
--    আগে DROP করতে হয় (PostgreSQL "cannot change return type" error দেয়)।
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
  is_match     boolean
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
    r.rating, r.badge, r.photo_url, r.vehicle_type,
    (round(ST_Distance(r.geo, me.g) / 5.0) * 5)::double precision as distance_m,
    (me.dg is not null and r.dest_geo is not null
      and ST_DWithin(r.dest_geo, me.dg, p_same_dest_m)) as is_match
  from public.active_riders r, me
  where r.geo is not null
    and r.status <> 'riding'
    and ST_DWithin(r.geo, me.g, p_radius_m)
  order by distance_m asc;
$$;
