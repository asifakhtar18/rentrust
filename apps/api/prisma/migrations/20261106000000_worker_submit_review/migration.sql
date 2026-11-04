-- Atomically create the review lifecycle row and its structured answer for the
-- Cloudflare API. The unique partial index remains the final concurrency guard.
CREATE OR REPLACE FUNCTION public.rentrust_submit_review(
  p_author_id uuid,
  p_property_id uuid,
  p_input jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review_id uuid := uuid_generate_v4();
  v_status "ReviewStatus";
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = p_property_id AND p.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('notFound', true);
  END IF;

  v_status := CASE WHEN coalesce((p_input->>'asDraft')::boolean, false)
    THEN 'DRAFT'::"ReviewStatus"
    ELSE 'PENDING_MODERATION'::"ReviewStatus"
  END;

  BEGIN
    INSERT INTO public.reviews (id, property_id, author_id, status, tenure, created_at, updated_at)
    VALUES (v_review_id, p_property_id, p_author_id, v_status, (p_input->>'tenure')::"TenureBucket", now(), now());

    INSERT INTO public.review_answers (
      id, review_id, tenure, management_responsiveness, maintenance_quality,
      maintenance_resolution, deposit_outcome, deductions_explained, communication,
      safety, water_supply, internet, noise, rules_strictness, would_rent_again,
      would_recommend, liked_tags, liked_text, disliked_tags, disliked_text,
      comments, created_at
    ) VALUES (
      uuid_generate_v4(), v_review_id, (p_input->>'tenure')::"TenureBucket",
      (p_input->>'managementResponsiveness')::integer,
      (p_input->>'maintenanceQuality')::integer,
      (p_input->>'maintenanceResolution')::"MaintenanceResolutionBucket",
      (p_input->>'depositOutcome')::"DepositOutcome",
      (p_input->>'deductionsExplained')::"YesNoNa",
      (p_input->>'communication')::integer,
      (p_input->>'safety')::integer,
      (p_input->>'waterSupply')::integer,
      nullif(p_input->>'internet', '')::integer,
      (p_input->>'noise')::integer,
      (p_input->>'rulesStrictness')::integer,
      (p_input->>'wouldRentAgain')::"TriState",
      (p_input->>'wouldRecommend')::boolean,
      ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'likedTags', '[]'::jsonb))),
      p_input->>'likedText',
      ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'dislikedTags', '[]'::jsonb))),
      p_input->>'dislikedText',
      p_input->>'comments', now()
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('conflict', true);
  END;

  RETURN jsonb_build_object('id', v_review_id, 'status', v_status::text);
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_submit_review(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_submit_review(uuid, uuid, jsonb) TO service_role;
