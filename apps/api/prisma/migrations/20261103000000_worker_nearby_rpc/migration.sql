-- PostGIS-backed RPC used by the Cloudflare Worker to preserve the NestJS
-- nearby-property contract without loading candidate properties into memory.
CREATE OR REPLACE FUNCTION public.rentrust_nearby_properties(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer DEFAULT 5000,
  p_limit integer DEFAULT 20
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  origin geography;
BEGIN
  IF p_latitude IS NULL OR p_latitude < -90 OR p_latitude > 90
    OR p_longitude IS NULL OR p_longitude < -180 OR p_longitude > 180
    OR p_radius_meters < 100 OR p_radius_meters > 50000
    OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid nearby properties parameters' USING ERRCODE = '22023';
  END IF;

  origin := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
  RETURN QUERY
    SELECT to_jsonb(p) || jsonb_build_object(
      'distance_meters', ST_Distance(p.geom::geography, origin)
    )
    FROM public.properties p
    WHERE p.deleted_at IS NULL
      AND p.status = 'ACTIVE'
      AND p.geom IS NOT NULL
      AND ST_DWithin(p.geom::geography, origin, p_radius_meters)
    ORDER BY p.geom::geography <-> origin
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rentrust_nearby_properties(double precision, double precision, integer, integer) TO service_role;
