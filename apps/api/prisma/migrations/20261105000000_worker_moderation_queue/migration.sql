-- Read-only, paginated moderator queue for the Cloudflare Worker API.
-- The queue and its total are calculated in one database statement so reported
-- reviews are deduplicated against pending reviews and page counts stay exact.
CREATE OR REPLACE FUNCTION public.rentrust_moderation_queue(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH report_summary AS (
    SELECT
      rr.review_id,
      count(*)::integer AS open_reports,
      array_agg(DISTINCT rr.reason::text ORDER BY rr.reason::text) AS report_reasons
    FROM public.review_reports rr
    WHERE rr.status::text IN ('OPEN', 'REVIEWING')
    GROUP BY rr.review_id
  ), queue AS (
    SELECT
      r.id,
      r.property_id,
      r.status::text AS status,
      r.created_at,
      coalesce(rs.open_reports, 0) AS open_reports,
      coalesce(rs.report_reasons, ARRAY[]::text[]) AS report_reasons
    FROM public.reviews r
    LEFT JOIN report_summary rs ON rs.review_id = r.id
    WHERE r.deleted_at IS NULL
      AND (r.status::text IN ('PENDING_MODERATION', 'UNDER_REVIEW') OR rs.review_id IS NOT NULL)
  ), page_rows AS (
    SELECT *
    FROM queue
    ORDER BY created_at ASC, id ASC
    LIMIT least(greatest(coalesce(p_page_size, 20), 1), 100)
    OFFSET (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 20), 1), 100)
  )
  SELECT jsonb_build_object(
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'propertyId', p.property_id,
        'status', p.status,
        'createdAt', p.created_at,
        'openReports', p.open_reports,
        'reportReasons', to_jsonb(p.report_reasons),
        'contentFlags', '[]'::jsonb
      ) ORDER BY p.created_at ASC, p.id ASC)
      FROM page_rows p
    ), '[]'::jsonb),
    'total', (SELECT count(*)::integer FROM queue),
    'page', greatest(coalesce(p_page, 1), 1),
    'pageSize', least(greatest(coalesce(p_page_size, 20), 1), 100)
  );
$$;

REVOKE ALL ON FUNCTION public.rentrust_moderation_queue(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_moderation_queue(integer, integer) TO service_role;
