-- Guarded owner-response upsert with Prisma-equivalent timestamp behavior.
CREATE OR REPLACE FUNCTION public.rentrust_upsert_owner_response(
  p_review_id uuid,
  p_responder_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review public.reviews%ROWTYPE;
  v_created_at timestamp(3);
BEGIN
  SELECT * INTO v_review FROM public.reviews
  WHERE id = p_review_id AND status = 'PUBLISHED' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.property_claims pc ON pc.claimant_id = u.id
    WHERE u.id = p_responder_id AND u.status = 'ACTIVE'
      AND u.roles && ARRAY['OWNER'::"UserRole", 'MANAGER'::"UserRole", 'ADMIN'::"UserRole"]
      AND pc.property_id = v_review.property_id AND pc.status = 'APPROVED'
  ) THEN
    RETURN jsonb_build_object('outcome', 'forbidden');
  END IF;

  INSERT INTO public.owner_responses (id, review_id, responder_id, body, created_at, updated_at)
  VALUES (uuid_generate_v4(), p_review_id, p_responder_id, p_body, now(), now())
  ON CONFLICT (review_id) DO UPDATE SET
    responder_id = excluded.responder_id,
    body = excluded.body,
    updated_at = now()
  RETURNING created_at INTO v_created_at;

  RETURN jsonb_build_object('reviewId', p_review_id, 'createdAt', v_created_at);
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_upsert_owner_response(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_upsert_owner_response(uuid, uuid, text) TO service_role;
