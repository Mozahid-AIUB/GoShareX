-- ============================================================
-- 0015 migration (PostGIS + nearby_riders RPC) run হয়েছে কিনা চেক।
-- Supabase SQL editor-এ run করো। ৩টা জিনিস দেখি:
-- ============================================================

-- ১) PostGIS extension আছে কিনা (থাকলে 1 row, version সহ)
select extname, extversion from pg_extension where extname = 'postgis';

-- ২) nearby_riders RPC আছে কিনা (থাকলে 1 row)
select proname from pg_proc where proname = 'nearby_riders';

-- ৩) active_riders-এ geo/dest_geo column আছে কিনা (থাকলে 2 row)
select column_name from information_schema.columns
where table_name = 'active_riders' and column_name in ('geo', 'dest_geo');

-- ৪) RPC আসলে কাজ করে কিনা — তোমার অবস্থান থেকে nearby টেস্ট।
--    (তোমার GPS: 23.7909868, 90.3869269; গন্তব্য কুড়িল: 23.8207146, 90.4231228)
--    কাজ করলে rider তালিকা distance_m + is_match সহ আসবে।
select name, distance_m, is_match
from public.nearby_riders(
  23.7909868, 90.3869269,    -- তোমার lat, lng
  23.8207146, 90.4231228,    -- তোমার গন্তব্য lat, lng
  1000,                       -- radius 1km
  500                         -- same-dest 500m
);
