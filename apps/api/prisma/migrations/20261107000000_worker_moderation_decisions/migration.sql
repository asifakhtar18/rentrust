-- Transactional moderation state transitions for the Worker API. These
-- functions keep review state, moderator history, report resolution, and audit
-- records consistent if any part of the operation fails.
CREATE OR REPLACE FUNCTION public.rentrust_review_overall(p_review_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT round((
    ((a.management_responsiveness - 1) / 4.0 * 100) +
    (((a.maintenance_quality - 1) / 4.0 * 100 + CASE a.maintenance_resolution::text
      WHEN 'LT_24H' THEN 100 WHEN 'D1_3' THEN 75 WHEN 'D3_7' THEN 45 ELSE 15 END) / 2) +
    (least(100, CASE a.deposit_outcome::text WHEN 'FULL' THEN 100 WHEN 'PARTIAL' THEN 55 WHEN 'STILL_WAITING' THEN 35 ELSE 0 END + CASE WHEN a.deductions_explained::text = 'YES' THEN 10 ELSE 0 END)) +
    ((a.communication - 1) / 4.0 * 100) +
    ((a.safety - 1) / 4.0 * 100) +
    (( ((a.water_supply - 1) / 4.0 * 100) + ((a.noise - 1) / 4.0 * 100) + CASE WHEN a.internet IS NULL THEN 0 ELSE ((a.internet - 1) / 4.0 * 100) END) / CASE WHEN a.internet IS NULL THEN 2.0 ELSE 3.0 END) +
    ((6 - a.rules_strictness - 1) / 4.0 * 100) +
    ((CASE WHEN a.would_recommend THEN 100 ELSE 0 END + CASE a.would_rent_again::text WHEN 'YES' THEN 100 WHEN 'MAYBE' THEN 55 ELSE 0 END) / 2.0)
  ) / 8.0)::integer
  FROM public.review_answers a WHERE a.review_id = p_review_id;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_moderate_review(
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
  v_review public.reviews%ROWTYPE;
  v_to "ReviewStatus";
  v_action "ModerationActionType";
  v_overall integer;
BEGIN
  SELECT * INTO v_review FROM public.reviews
  WHERE id = p_review_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;

  CASE p_decision
    WHEN 'PUBLISH' THEN v_to := 'PUBLISHED'; v_action := 'PUBLISH';
    WHEN 'REJECT' THEN v_to := 'REJECTED'; v_action := 'REJECT';
    WHEN 'HIDE' THEN v_to := 'HIDDEN'; v_action := 'HIDE';
    WHEN 'UNHIDE' THEN v_to := 'PUBLISHED'; v_action := 'UNHIDE';
    WHEN 'REMOVE' THEN v_to := 'REMOVED'; v_action := 'REMOVE';
    WHEN 'RESTORE' THEN v_to := 'PUBLISHED'; v_action := 'RESTORE';
    ELSE RAISE EXCEPTION 'Invalid moderation decision';
  END CASE;
  IF p_decision = 'PUBLISH' AND v_review.status = 'REMOVED' THEN
    RETURN jsonb_build_object('outcome', 'invalid_state');
  END IF;

  IF p_decision = 'PUBLISH' THEN
    v_overall := public.rentrust_review_overall(p_review_id);
    UPDATE public.reviews SET status = v_to, published_at = now(), overall = v_overall, updated_at = now() WHERE id = p_review_id;
  ELSE
    UPDATE public.reviews SET status = v_to, updated_at = now() WHERE id = p_review_id;
  END IF;
  INSERT INTO public.moderation_actions (id, review_id, moderator_id, action, note, from_status, to_status, created_at)
  VALUES (uuid_generate_v4(), p_review_id, p_moderator_id, v_action, p_note, v_review.status, v_to, now());
  UPDATE public.review_reports SET status = 'ACTIONED', updated_at = now()
  WHERE review_id = p_review_id AND status IN ('OPEN', 'REVIEWING');
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (uuid_generate_v4(), p_moderator_id, 'REVIEW_' || p_decision, 'Review', p_review_id::text,
      jsonb_build_object('from', v_review.status::text, 'to', v_to::text), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('outcome', 'updated', 'id', p_review_id, 'status', v_to::text, 'propertyId', v_review.property_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_submit_review_appeal(
  p_review_id uuid,
  p_author_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review public.reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM public.reviews
  WHERE id = p_review_id AND author_id = p_author_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF v_review.status::text NOT IN ('REJECTED', 'HIDDEN', 'REMOVED') THEN
    RETURN jsonb_build_object('outcome', 'invalid_state');
  END IF;
  UPDATE public.reviews SET status = 'UNDER_REVIEW', updated_at = now() WHERE id = p_review_id;
  INSERT INTO public.moderation_actions (id, review_id, moderator_id, action, note, from_status, to_status, created_at)
  VALUES (uuid_generate_v4(), p_review_id, NULL, 'NOTE', 'APPEAL by resident: ' || p_reason, v_review.status, 'UNDER_REVIEW', now());
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, created_at)
    VALUES (uuid_generate_v4(), p_author_id, 'REVIEW_APPEAL_SUBMITTED', 'Review', p_review_id::text, now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('outcome', 'updated');
END;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_decide_review_appeal(
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
  v_review public.reviews%ROWTYPE;
  v_to "ReviewStatus";
  v_action "ModerationActionType";
  v_overall integer;
BEGIN
  SELECT * INTO v_review FROM public.reviews WHERE id = p_review_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found'); END IF;
  IF p_decision = 'GRANT' THEN
    v_to := 'PUBLISHED'; v_action := 'APPEAL_GRANTED';
    v_overall := public.rentrust_review_overall(p_review_id);
    UPDATE public.reviews SET status = v_to, published_at = now(), overall = v_overall, updated_at = now() WHERE id = p_review_id;
  ELSIF p_decision = 'DENY' THEN
    v_to := 'REMOVED'; v_action := 'APPEAL_DENIED';
    UPDATE public.reviews SET status = v_to, updated_at = now() WHERE id = p_review_id;
  ELSE
    RAISE EXCEPTION 'Invalid appeal decision';
  END IF;
  INSERT INTO public.moderation_actions (id, review_id, moderator_id, action, note, from_status, to_status, created_at)
  VALUES (uuid_generate_v4(), p_review_id, p_moderator_id, v_action, p_note, v_review.status, v_to, now());
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, created_at)
    VALUES (uuid_generate_v4(), p_moderator_id, 'REVIEW_APPEAL_' || p_decision, 'Review', p_review_id::text, now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('outcome', 'updated', 'id', p_review_id, 'status', v_to::text, 'propertyId', v_review.property_id);
END;
$$;

-- Synchronous score projection used by Worker requests in place of a
-- long-lived BullMQ consumer. The formula matches TrustScoreEngine.
CREATE OR REPLACE FUNCTION public.rentrust_recalculate_property_score(
  p_property_id uuid,
  p_min_reviews integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample_size integer;
  v_answer_count integer;
  v_config_id uuid;
  v_weights jsonb;
  v_means jsonb;
  v_categories jsonb;
  v_overall integer;
  v_confidence double precision;
  v_positive text[];
  v_negative text[];
  v_weight_sum double precision;
  v_weighted_total double precision;
BEGIN
  SELECT count(*)::integer INTO v_sample_size FROM public.reviews
  WHERE property_id = p_property_id AND status = 'PUBLISHED' AND deleted_at IS NULL;
  IF v_sample_size = 0 THEN
    DELETE FROM public.property_scores WHERE property_id = p_property_id;
    RETURN NULL;
  END IF;

  SELECT id, weights INTO v_config_id, v_weights FROM public.score_configurations WHERE is_active = true LIMIT 1;
  v_weights := coalesce(v_weights, '{"management":0.25,"maintenance":0.15,"deposit":0.1,"communication":0.1,"safety":0.1,"condition":0.1,"rules":0.1,"experience":0.1}'::jsonb);

  WITH answer_scores AS (
    SELECT
      (a.management_responsiveness - 1) / 4.0 * 100 AS management,
      ((a.maintenance_quality - 1) / 4.0 * 100 + CASE a.maintenance_resolution::text WHEN 'LT_24H' THEN 100 WHEN 'D1_3' THEN 75 WHEN 'D3_7' THEN 45 ELSE 15 END) / 2 AS maintenance,
      least(100, CASE a.deposit_outcome::text WHEN 'FULL' THEN 100 WHEN 'PARTIAL' THEN 55 WHEN 'STILL_WAITING' THEN 35 ELSE 0 END + CASE WHEN a.deductions_explained::text = 'YES' THEN 10 ELSE 0 END) AS deposit,
      (a.communication - 1) / 4.0 * 100 AS communication,
      (a.safety - 1) / 4.0 * 100 AS safety,
      (((a.water_supply - 1) / 4.0 * 100) + ((a.noise - 1) / 4.0 * 100) + CASE WHEN a.internet IS NULL THEN 0 ELSE (a.internet - 1) / 4.0 * 100 END) / CASE WHEN a.internet IS NULL THEN 2.0 ELSE 3.0 END AS condition,
      (6 - a.rules_strictness - 1) / 4.0 * 100 AS rules,
      (CASE WHEN a.would_recommend THEN 100 ELSE 0 END + CASE a.would_rent_again::text WHEN 'YES' THEN 100 WHEN 'MAYBE' THEN 55 ELSE 0 END) / 2.0 AS experience
    FROM public.reviews r JOIN public.review_answers a ON a.review_id = r.id
    WHERE r.property_id = p_property_id AND r.status = 'PUBLISHED' AND r.deleted_at IS NULL
  ), averages AS (
    SELECT avg(management) AS management, avg(maintenance) AS maintenance,
      avg(deposit) AS deposit, avg(communication) AS communication,
      avg(safety) AS safety, avg(condition) AS condition, avg(rules) AS rules,
      avg(experience) AS experience, count(*)::integer AS n
    FROM answer_scores
  )
  SELECT jsonb_build_object(
    'management', coalesce(management, 0), 'maintenance', coalesce(maintenance, 0),
    'deposit', coalesce(deposit, 0), 'communication', coalesce(communication, 0),
    'safety', coalesce(safety, 0), 'condition', coalesce(condition, 0),
    'rules', coalesce(rules, 0), 'experience', coalesce(experience, 0)
  ), jsonb_build_object(
    'management', jsonb_build_object('score', round(coalesce(management, 0)), 'sampleSize', n),
    'maintenance', jsonb_build_object('score', round(coalesce(maintenance, 0)), 'sampleSize', n),
    'deposit', jsonb_build_object('score', round(coalesce(deposit, 0)), 'sampleSize', n),
    'communication', jsonb_build_object('score', round(coalesce(communication, 0)), 'sampleSize', n),
    'safety', jsonb_build_object('score', round(coalesce(safety, 0)), 'sampleSize', n),
    'condition', jsonb_build_object('score', round(coalesce(condition, 0)), 'sampleSize', n),
    'rules', jsonb_build_object('score', round(coalesce(rules, 0)), 'sampleSize', n),
    'experience', jsonb_build_object('score', round(coalesce(experience, 0)), 'sampleSize', n)
  ), n INTO v_means, v_categories, v_answer_count FROM averages;

  v_weight_sum := coalesce((v_weights->>'management')::double precision, 0.25) +
    coalesce((v_weights->>'maintenance')::double precision, 0.15) +
    coalesce((v_weights->>'deposit')::double precision, 0.1) +
    coalesce((v_weights->>'communication')::double precision, 0.1) +
    coalesce((v_weights->>'safety')::double precision, 0.1) +
    coalesce((v_weights->>'condition')::double precision, 0.1) +
    coalesce((v_weights->>'rules')::double precision, 0.1) +
    coalesce((v_weights->>'experience')::double precision, 0.1);
  v_weighted_total := coalesce((v_means->>'management')::double precision, 0) * coalesce((v_weights->>'management')::double precision, 0.25) +
    coalesce((v_means->>'maintenance')::double precision, 0) * coalesce((v_weights->>'maintenance')::double precision, 0.15) +
    coalesce((v_means->>'deposit')::double precision, 0) * coalesce((v_weights->>'deposit')::double precision, 0.1) +
    coalesce((v_means->>'communication')::double precision, 0) * coalesce((v_weights->>'communication')::double precision, 0.1) +
    coalesce((v_means->>'safety')::double precision, 0) * coalesce((v_weights->>'safety')::double precision, 0.1) +
    coalesce((v_means->>'condition')::double precision, 0) * coalesce((v_weights->>'condition')::double precision, 0.1) +
    coalesce((v_means->>'rules')::double precision, 0) * coalesce((v_weights->>'rules')::double precision, 0.1) +
    coalesce((v_means->>'experience')::double precision, 0) * coalesce((v_weights->>'experience')::double precision, 0.1);
  v_overall := CASE WHEN v_weight_sum > 0 THEN round(v_weighted_total / v_weight_sum)::integer ELSE 0 END;
  v_confidence := CASE WHEN p_min_reviews <= 0 THEN 1 ELSE least(1, round((1 - exp(-v_sample_size / greatest(1.0, p_min_reviews / 3.0)))::numeric, 2)::double precision) END;

  SELECT coalesce(array_agg(tag ORDER BY count DESC, tag) FILTER (WHERE rank <= 5), ARRAY[]::text[])
  INTO v_positive FROM (
    SELECT tag, count(*) AS count, row_number() OVER (ORDER BY count(*) DESC, tag) AS rank
    FROM public.reviews r JOIN public.review_answers a ON a.review_id = r.id, unnest(a.liked_tags) tag
    WHERE r.property_id = p_property_id AND r.status = 'PUBLISHED' AND r.deleted_at IS NULL
    GROUP BY tag
  ) themes;
  SELECT coalesce(array_agg(tag ORDER BY count DESC, tag) FILTER (WHERE rank <= 5), ARRAY[]::text[])
  INTO v_negative FROM (
    SELECT tag, count(*) AS count, row_number() OVER (ORDER BY count(*) DESC, tag) AS rank
    FROM public.reviews r JOIN public.review_answers a ON a.review_id = r.id, unnest(a.disliked_tags) tag
    WHERE r.property_id = p_property_id AND r.status = 'PUBLISHED' AND r.deleted_at IS NULL
    GROUP BY tag
  ) themes;

  INSERT INTO public.property_scores (property_id, config_id, overall, sample_size, confidence, category_scores, positive_themes, negative_themes, last_calculated_at, updated_at)
  VALUES (p_property_id, v_config_id, v_overall, v_sample_size, v_confidence, v_categories, coalesce(v_positive, ARRAY[]::text[]), coalesce(v_negative, ARRAY[]::text[]), now(), now())
  ON CONFLICT (property_id) DO UPDATE SET config_id = excluded.config_id, overall = excluded.overall,
    sample_size = excluded.sample_size, confidence = excluded.confidence, category_scores = excluded.category_scores,
    positive_themes = excluded.positive_themes, negative_themes = excluded.negative_themes,
    last_calculated_at = excluded.last_calculated_at, updated_at = excluded.updated_at;

  RETURN jsonb_build_object('overall', v_overall, 'sampleSize', v_sample_size, 'confidence', v_confidence,
    'categoryScores', v_categories, 'positiveThemes', coalesce(to_jsonb(v_positive), '[]'::jsonb),
    'negativeThemes', coalesce(to_jsonb(v_negative), '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_review_overall(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentrust_moderate_review(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentrust_submit_review_appeal(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentrust_decide_review_appeal(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_moderate_review(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_submit_review_appeal(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_decide_review_appeal(uuid, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.rentrust_recalculate_property_score(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_recalculate_property_score(uuid, integer) TO service_role;
