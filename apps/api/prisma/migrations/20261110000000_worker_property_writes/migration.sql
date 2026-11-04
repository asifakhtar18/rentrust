-- Atomic create used by both NestJS (advisory lock) and the Worker API.
CREATE OR REPLACE FUNCTION public.rentrust_create_property(
  p_input jsonb,
  p_canonical_name text,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_address_id uuid;
  v_property_id uuid := uuid_generate_v4();
  v_locality_id uuid;
  v_created_at timestamp(3) := now();
  v_updated_at timestamp(3) := now();
BEGIN
  v_locality_id := coalesce(nullif(p_input->>'localityId', '')::uuid,
    nullif(p_input#>>'{address,localityId}', '')::uuid);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_canonical_name, 0));
  IF EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.deleted_at IS NULL AND p.canonical_name = p_canonical_name
      AND (v_locality_id IS NULL OR p.locality_id = v_locality_id)
  ) THEN
    RETURN jsonb_build_object('outcome', 'duplicate');
  END IF;

  IF p_input ? 'address' AND p_input->'address' <> 'null'::jsonb THEN
    v_address_id := uuid_generate_v4();
    INSERT INTO public.addresses (id, line1, line2, locality_id, city_id, postal_code, updated_at)
    VALUES (v_address_id, p_input#>>'{address,line1}', p_input#>>'{address,line2}',
      nullif(p_input#>>'{address,localityId}', '')::uuid,
      (p_input#>>'{address,cityId}')::uuid,
      p_input#>>'{address,postalCode}', v_updated_at);
  END IF;

  INSERT INTO public.properties (
    id, canonical_name, display_name, slug, aliases, property_type, status,
    address_id, locality_id, latitude, longitude, developer, year_built,
    amenities, description, is_claimed, created_at, updated_at
  ) VALUES (
    v_property_id, p_canonical_name, p_input->>'displayName', p_slug,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'aliases', '[]'::jsonb))),
    (p_input->>'propertyType')::"PropertyType", 'ACTIVE', v_address_id, v_locality_id,
    nullif(p_input->>'latitude', '')::double precision,
    nullif(p_input->>'longitude', '')::double precision,
    p_input->>'developer', nullif(p_input->>'yearBuilt', '')::integer,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'amenities', '[]'::jsonb))),
    p_input->>'description', false, v_created_at, v_updated_at
  );

  RETURN jsonb_build_object(
    'id', v_property_id, 'canonicalName', p_canonical_name,
    'displayName', p_input->>'displayName', 'slug', p_slug,
    'aliases', coalesce(p_input->'aliases', '[]'::jsonb),
    'propertyType', p_input->>'propertyType', 'status', 'ACTIVE',
    'localityId', v_locality_id, 'latitude', nullif(p_input->>'latitude', '')::double precision,
    'longitude', nullif(p_input->>'longitude', '')::double precision,
    'developer', p_input->>'developer', 'yearBuilt', nullif(p_input->>'yearBuilt', '')::integer,
    'amenities', coalesce(p_input->'amenities', '[]'::jsonb), 'description', p_input->>'description',
    'isClaimed', false, 'createdAt', v_created_at, 'updatedAt', v_updated_at
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('outcome', 'duplicate');
END;
$$;

REVOKE ALL ON FUNCTION public.rentrust_create_property(jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rentrust_create_property(jsonb, text, text) TO service_role;
