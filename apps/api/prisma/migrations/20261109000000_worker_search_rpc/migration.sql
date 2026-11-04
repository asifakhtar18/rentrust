-- Search RPC matching PostgresSearchProvider's full-text, trigram, alias, and
-- optional PostGIS ranking. Entity results are merged and capped after rank.
CREATE OR REPLACE FUNCTION public.rentrust_search(
  p_term text,
  p_types text[] DEFAULT ARRAY['property', 'landlord', 'locality']::text[],
  p_limit integer DEFAULT 20,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_radius_meters integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT btrim(p_term) AS term,
      p_types AS types,
      least(greatest(coalesce(p_limit, 20), 1), 50) AS result_limit,
      (p_latitude IS NOT NULL AND p_longitude IS NOT NULL) AS has_geo,
      CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ELSE NULL::geography END AS geo_point
  ), property_hits AS (
    SELECT 'property'::text AS type, p.id::text AS id, p.display_name AS title,
      l.name AS subtitle, p.slug,
      (coalesce(ts_rank(p.search_vector, plainto_tsquery('simple', prm.term)), 0) +
        greatest(similarity(p.display_name, prm.term), similarity(p.canonical_name, prm.term)) +
        CASE WHEN EXISTS (SELECT 1 FROM unnest(p.aliases) alias WHERE alias ILIKE '%' || prm.term || '%') THEN 0.5 ELSE 0 END)::double precision AS relevance,
      CASE WHEN prm.has_geo AND p.geom IS NOT NULL THEN ST_Distance(p.geom::geography, prm.geo_point)::double precision ELSE NULL END AS distance_meters,
      jsonb_build_object('propertyType', p.property_type::text) AS meta
    FROM public.properties p
    LEFT JOIN public.localities l ON l.id = p.locality_id
    CROSS JOIN params prm
    WHERE 'property' = ANY(prm.types) AND p.deleted_at IS NULL AND p.status = 'ACTIVE'
      AND (p.search_vector @@ plainto_tsquery('simple', prm.term)
        OR p.display_name ILIKE '%' || prm.term || '%'
        OR p.canonical_name % prm.term
        OR EXISTS (SELECT 1 FROM unnest(p.aliases) alias WHERE alias ILIKE '%' || prm.term || '%'))
      AND (NOT prm.has_geo OR p_radius_meters IS NULL OR
        (p.geom IS NOT NULL AND ST_DWithin(p.geom::geography, prm.geo_point, p_radius_meters)))
  ), landlord_hits AS (
    SELECT 'landlord'::text AS type, la.id::text AS id, la.display_name AS title,
      CASE WHEN la.is_company THEN 'Company' ELSE 'Individual' END AS subtitle,
      la.slug,
      (similarity(la.display_name, prm.term) +
        CASE WHEN EXISTS (SELECT 1 FROM unnest(la.aliases) alias WHERE alias ILIKE '%' || prm.term || '%') THEN 0.5 ELSE 0 END)::double precision AS relevance,
      NULL::double precision AS distance_meters, NULL::jsonb AS meta
    FROM public.landlords la CROSS JOIN params prm
    WHERE 'landlord' = ANY(prm.types) AND la.deleted_at IS NULL
      AND (la.display_name ILIKE '%' || prm.term || '%'
        OR la.display_name % prm.term
        OR EXISTS (SELECT 1 FROM unnest(la.aliases) alias WHERE alias ILIKE '%' || prm.term || '%'))
  ), locality_hits AS (
    SELECT 'locality'::text AS type, lo.id::text AS id, lo.name AS title,
      c.name AS subtitle, lo.slug, similarity(lo.name, prm.term)::double precision AS relevance,
      NULL::double precision AS distance_meters, NULL::jsonb AS meta
    FROM public.localities lo JOIN public.cities c ON c.id = lo.city_id CROSS JOIN params prm
    WHERE 'locality' = ANY(prm.types)
      AND (lo.name ILIKE '%' || prm.term || '%' OR lo.name % prm.term)
  ), all_hits AS (
    SELECT * FROM property_hits UNION ALL SELECT * FROM landlord_hits UNION ALL SELECT * FROM locality_hits
  ), ranked AS (
    SELECT * FROM all_hits
    ORDER BY relevance DESC, distance_meters ASC NULLS LAST,
      CASE type WHEN 'property' THEN 1 WHEN 'landlord' THEN 2 ELSE 3 END ASC
    LIMIT (SELECT result_limit FROM params)
  )
  SELECT coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'type', type, 'id', id, 'title', title, 'subtitle', subtitle, 'slug', slug,
    'relevance', relevance,
    'distanceMeters', distance_meters,
    'meta', meta
  )) ORDER BY relevance DESC, distance_meters ASC NULLS LAST,
      CASE type WHEN 'property' THEN 1 WHEN 'landlord' THEN 2 ELSE 3 END ASC), '[]'::jsonb)
  FROM ranked;
$$;

REVOKE ALL ON FUNCTION public.rentrust_search(text, text[], integer, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_search(text, text[], integer, double precision, double precision, integer) TO service_role;
