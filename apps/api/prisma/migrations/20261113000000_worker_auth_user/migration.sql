-- Keep the Supabase Auth identity and RenTrust's domain user/profile in sync.
-- This is an idempotent transaction boundary for signup retries.
CREATE OR REPLACE FUNCTION public.rentrust_ensure_auth_user(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_email_verified boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alias text;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Valid auth user id and email are required';
  END IF;

  INSERT INTO public.users (id, email, display_name, roles, status, email_verified_at, created_at, updated_at)
  VALUES (
    p_user_id,
    lower(trim(p_email)),
    nullif(trim(p_display_name), ''),
    ARRAY['USER'::"UserRole"],
    'ACTIVE'::"UserStatus",
    CASE WHEN coalesce(p_email_verified, false) THEN now() ELSE NULL END,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    email_verified_at = coalesce(public.users.email_verified_at, excluded.email_verified_at),
    updated_at = now();

  v_alias := 'Verified Resident #' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 6));
  INSERT INTO public.resident_profiles (id, user_id, public_alias, created_at, updated_at)
  VALUES (uuid_generate_v4(), p_user_id, v_alias, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_ensure_auth_user(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rentrust_ensure_auth_user(uuid, text, text, boolean) TO service_role;
