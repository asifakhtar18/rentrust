-- Keep Worker domain decisions and their in-app notification side effects in
-- one Postgres transaction. NestJS continues to use its existing event bus.
CREATE OR REPLACE FUNCTION public.rentrust_insert_in_app_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (id, user_id, channel, type, title, body, data, status, created_at)
  VALUES (uuid_generate_v4(), p_user_id, 'IN_APP'::"NotificationChannel", p_type, p_title, p_body,
    p_data, 'SENT'::"NotificationStatus", now());
$$;

CREATE OR REPLACE FUNCTION public.rentrust_moderate_review_and_notify(
  p_review_id uuid,
  p_moderator_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_review public.reviews%ROWTYPE;
BEGIN
  v_result := public.rentrust_moderate_review(p_review_id, p_moderator_id, p_decision, p_note);
  IF v_result->>'outcome' <> 'updated' THEN RETURN v_result; END IF;
  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;
  IF NOT FOUND THEN RETURN v_result; END IF;

  IF p_decision IN ('PUBLISH', 'UNHIDE', 'RESTORE') THEN
    PERFORM public.rentrust_insert_in_app_notification(v_review.author_id, 'REVIEW_PUBLISHED',
      'Your review is live', 'Your review has been published and is now helping other renters.',
      jsonb_build_object('reviewId', p_review_id, 'propertyId', v_review.property_id));
  ELSIF p_decision = 'REMOVE' THEN
    PERFORM public.rentrust_insert_in_app_notification(v_review.author_id, 'REVIEW_REMOVED',
      'Your review was removed', 'A moderator removed your review. You can appeal this decision.',
      jsonb_build_object('reviewId', p_review_id, 'propertyId', v_review.property_id));
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_decide_review_appeal_and_notify(
  p_review_id uuid,
  p_moderator_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_review public.reviews%ROWTYPE;
BEGIN
  v_result := public.rentrust_decide_review_appeal(p_review_id, p_moderator_id, p_decision, p_note);
  IF v_result->>'outcome' <> 'updated' THEN RETURN v_result; END IF;
  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id;
  IF NOT FOUND THEN RETURN v_result; END IF;

  IF p_decision = 'GRANT' THEN
    PERFORM public.rentrust_insert_in_app_notification(v_review.author_id, 'REVIEW_PUBLISHED',
      'Your review is live', 'Your review has been published and is now helping other renters.',
      jsonb_build_object('reviewId', p_review_id, 'propertyId', v_review.property_id));
  ELSIF p_decision = 'DENY' THEN
    PERFORM public.rentrust_insert_in_app_notification(v_review.author_id, 'REVIEW_REMOVED',
      'Your review was removed', 'A moderator removed your review. You can appeal this decision.',
      jsonb_build_object('reviewId', p_review_id, 'propertyId', v_review.property_id));
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_decide_claim_and_notify(
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
  v_result jsonb;
  v_claim public.property_claims%ROWTYPE;
BEGIN
  v_result := public.rentrust_decide_claim(p_claim_id, p_reviewer_id, p_decision, p_rejection_reason);
  IF v_result->>'outcome' <> 'updated' OR p_decision <> 'APPROVED' THEN RETURN v_result; END IF;
  SELECT * INTO v_claim FROM public.property_claims WHERE id = p_claim_id;
  IF FOUND THEN
    PERFORM public.rentrust_insert_in_app_notification(v_claim.claimant_id, 'PROPERTY_CLAIM_APPROVED',
      'Property claim approved', 'Your claim was approved. You can now respond to reviews on this property.',
      jsonb_build_object('propertyId', v_claim.property_id));
  END IF;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_decide_verification_and_notify(
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
  v_result jsonb;
  v_request public.verification_requests%ROWTYPE;
  v_author_id uuid;
BEGIN
  v_result := public.rentrust_decide_verification(p_request_id, p_reviewer_id, p_decision, p_rejection_reason);
  IF v_result->>'outcome' <> 'updated' OR p_decision <> 'VERIFIED' THEN RETURN v_result; END IF;
  SELECT * INTO v_request FROM public.verification_requests WHERE id = p_request_id;
  IF FOUND AND v_request.review_id IS NOT NULL THEN
    SELECT author_id INTO v_author_id FROM public.reviews WHERE id = v_request.review_id;
    IF v_author_id IS NOT NULL THEN
      PERFORM public.rentrust_insert_in_app_notification(v_author_id, 'REVIEW_VERIFIED',
        'Your residency was verified', 'Your review now carries a Verified Resident badge.',
        jsonb_build_object('reviewId', v_request.review_id, 'propertyId', v_request.property_id));
    END IF;
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_insert_in_app_notification(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rentrust_moderate_review_and_notify(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rentrust_decide_review_appeal_and_notify(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rentrust_decide_claim_and_notify(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rentrust_decide_verification_and_notify(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rentrust_moderate_review_and_notify(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_review_appeal_and_notify(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_claim_and_notify(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_verification_and_notify(uuid, uuid, text, text) TO service_role;
