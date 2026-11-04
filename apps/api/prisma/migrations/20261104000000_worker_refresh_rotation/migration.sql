-- Atomically rotates a refresh-token session for the Cloudflare Worker.
-- Reuse of a rotated/revoked token revokes the user's remaining active sessions.
CREATE OR REPLACE FUNCTION public.rentrust_rotate_session(
  p_old_hash text,
  p_new_hash text,
  p_user_agent text,
  p_ip text,
  p_expires_at timestamptz
)
RETURNS TABLE(outcome text, user_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_session public.sessions%ROWTYPE;
  account_status text;
  new_session_id uuid;
BEGIN
  SELECT * INTO old_session
  FROM public.sessions
  WHERE refresh_token_hash = p_old_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid;
    RETURN;
  END IF;

  IF old_session.revoked_at IS NOT NULL OR old_session.replaced_by_id IS NOT NULL THEN
    UPDATE public.sessions SET revoked_at = now()
    WHERE sessions.user_id = old_session.user_id AND sessions.revoked_at IS NULL;
    RETURN QUERY SELECT 'reused'::text, old_session.user_id;
    RETURN;
  END IF;

  IF old_session.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::text, old_session.user_id;
    RETURN;
  END IF;

  SELECT status::text INTO account_status FROM public.users WHERE id = old_session.user_id;
  IF account_status IS DISTINCT FROM 'ACTIVE' THEN
    RETURN QUERY SELECT 'inactive'::text, old_session.user_id;
    RETURN;
  END IF;

  INSERT INTO public.sessions(user_id, refresh_token_hash, user_agent, ip, expires_at)
  VALUES (old_session.user_id, p_new_hash, p_user_agent, p_ip, p_expires_at)
  RETURNING id INTO new_session_id;

  UPDATE public.sessions
  SET revoked_at = now(), replaced_by_id = new_session_id
  WHERE id = old_session.id;

  RETURN QUERY SELECT 'rotated'::text, old_session.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rentrust_rotate_session(text, text, text, text, timestamptz) TO service_role;
