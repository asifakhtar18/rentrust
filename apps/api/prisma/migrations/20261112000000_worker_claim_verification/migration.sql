-- Transactional claim and verification decisions for the Worker API.
CREATE OR REPLACE FUNCTION public.rentrust_decide_verification(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.verification_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.verification_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF v_request.status <> 'PENDING' THEN RETURN jsonb_build_object('outcome', 'invalid_state'); END IF;
  IF p_decision NOT IN ('VERIFIED', 'REJECTED') THEN RAISE EXCEPTION 'Invalid verification decision'; END IF;

  UPDATE public.verification_requests SET status = p_decision::"VerificationStatus",
    reviewer_id = p_reviewer_id, decided_at = now(),
    rejection_reason = CASE WHEN p_decision = 'REJECTED' THEN p_rejection_reason ELSE NULL END,
    updated_at = now()
  WHERE id = p_request_id;
  IF p_decision = 'VERIFIED' AND v_request.review_id IS NOT NULL THEN
    UPDATE public.reviews SET is_verified = true, updated_at = now() WHERE id = v_request.review_id;
  END IF;
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (uuid_generate_v4(), p_reviewer_id,
      CASE WHEN p_decision = 'VERIFIED' THEN 'VERIFICATION_APPROVED' ELSE 'VERIFICATION_REJECTED' END,
      'VerificationRequest', p_request_id::text, jsonb_build_object('decision', p_decision), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('outcome', 'updated', 'id', p_request_id, 'status', p_decision,
    'propertyId', v_request.property_id, 'reviewId', v_request.review_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_decide_claim(
  p_claim_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim public.property_claims%ROWTYPE;
  v_role "UserRole";
BEGIN
  SELECT * INTO v_claim FROM public.property_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF v_claim.status <> 'PENDING' THEN RETURN jsonb_build_object('outcome', 'invalid_state'); END IF;
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN RAISE EXCEPTION 'Invalid claim decision'; END IF;

  UPDATE public.property_claims SET status = p_decision::"ClaimStatus",
    reviewer_id = p_reviewer_id, decided_at = now(),
    rejection_reason = CASE WHEN p_decision = 'REJECTED' THEN p_rejection_reason ELSE NULL END,
    updated_at = now()
  WHERE id = p_claim_id;
  IF p_decision = 'APPROVED' THEN
    UPDATE public.properties SET is_claimed = true, updated_at = now() WHERE id = v_claim.property_id;
    v_role := CASE WHEN v_claim.role = 'OWNER' THEN 'OWNER'::"UserRole" ELSE 'MANAGER'::"UserRole" END;
    UPDATE public.users SET roles = CASE WHEN v_role = ANY(roles) THEN roles ELSE array_append(roles, v_role) END,
      updated_at = now()
    WHERE id = v_claim.claimant_id;
  END IF;
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (uuid_generate_v4(), p_reviewer_id,
      CASE WHEN p_decision = 'APPROVED' THEN 'PROPERTY_CLAIM_APPROVED' ELSE 'PROPERTY_CLAIM_REJECTED' END,
      'PropertyClaim', p_claim_id::text, jsonb_build_object('decision', p_decision), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('outcome', 'updated', 'id', p_claim_id, 'status', p_decision,
    'propertyId', v_claim.property_id, 'claimRole', v_claim.role::text);
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_decide_verification(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentrust_decide_claim(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_verification(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_claim(uuid, uuid, text, text) TO service_role;
