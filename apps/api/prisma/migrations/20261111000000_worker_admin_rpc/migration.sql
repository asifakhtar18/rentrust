-- Server-side aggregation for the admin analytics and atomic score-weight
-- activation for the Worker API.
CREATE OR REPLACE FUNCTION public.rentrust_analytics_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', grouped.name, 'count', grouped.event_count)
    ORDER BY grouped.event_count DESC), '[]'::jsonb)
  FROM (
    SELECT name, count(*)::integer AS event_count
    FROM public.analytics_events
    GROUP BY name
  ) grouped;
$$;

CREATE OR REPLACE FUNCTION public.rentrust_update_score_weights(
  p_actor_id uuid,
  p_name text,
  p_weights jsonb,
  p_activate boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.score_configurations%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_actor_id AND status = 'ACTIVE' AND 'ADMIN'::"UserRole" = ANY(roles)
  ) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  IF coalesce(p_activate, true) THEN
    UPDATE public.score_configurations SET is_active = false WHERE is_active = true;
  END IF;
  INSERT INTO public.score_configurations (id, name, is_active, weights, created_at)
  VALUES (uuid_generate_v4(), p_name, coalesce(p_activate, true), p_weights, now())
  ON CONFLICT (name) DO UPDATE SET weights = excluded.weights, is_active = excluded.is_active
  RETURNING * INTO v_config;
  BEGIN
    INSERT INTO public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (uuid_generate_v4(), p_actor_id, 'SCORE_CONFIG_UPDATED', 'ScoreConfiguration', v_config.id::text,
      jsonb_build_object('name', p_name, 'activate', coalesce(p_activate, true)), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('id', v_config.id, 'name', v_config.name, 'isActive', v_config.is_active,
    'weights', v_config.weights, 'createdAt', v_config.created_at);
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_analytics_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rentrust_update_score_weights(uuid, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_analytics_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.rentrust_update_score_weights(uuid, text, jsonb, boolean) TO service_role;
