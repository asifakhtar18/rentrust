-- Consolidate the admin dashboard counters into one database subrequest.
CREATE OR REPLACE FUNCTION public.rentrust_admin_dashboard()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL),
    'verifiedResidents', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL AND email_verified_at IS NOT NULL),
    'reviews', (SELECT count(*) FROM public.reviews WHERE deleted_at IS NULL),
    'verifiedReviews', (SELECT count(*) FROM public.reviews WHERE deleted_at IS NULL AND is_verified = true),
    'properties', (SELECT count(*) FROM public.properties WHERE deleted_at IS NULL),
    'claimedProperties', (SELECT count(*) FROM public.properties WHERE deleted_at IS NULL AND is_claimed = true),
    'pendingModeration', (SELECT count(*) FROM public.reviews WHERE status IN ('PENDING_MODERATION', 'UNDER_REVIEW')),
    'pendingVerification', (SELECT count(*) FROM public.verification_requests WHERE status = 'PENDING'),
    'openReports', (SELECT count(*) FROM public.review_reports WHERE status = 'OPEN'),
    'activeCities', (SELECT count(*) FROM public.cities WHERE is_active = true)
  );
$$;

REVOKE ALL ON FUNCTION public.rentrust_admin_dashboard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rentrust_admin_dashboard() TO service_role;
