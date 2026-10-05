-- =============================================================================
-- Spatial geometry, search indexes, and integrity constraints that Prisma's
-- schema language cannot express directly.
--
-- Geometry note: PostGIS constructor functions (ST_MakePoint/ST_SetSRID) are
-- not marked IMMUTABLE in every build, so a STORED generated column is
-- rejected. We instead maintain a plain geometry column via a BEFORE trigger
-- that recomputes it from latitude/longitude on insert/update. Same query
-- ergonomics, portable across PostGIS builds.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Geometry columns (SRID 4326 = WGS84) kept in sync by a trigger.
-- ----------------------------------------------------------------------------

ALTER TABLE "properties" ADD COLUMN "geom" geometry(Point, 4326);
ALTER TABLE "localities" ADD COLUMN "geom" geometry(Point, 4326);
ALTER TABLE "addresses" ADD COLUMN "geom" geometry(Point, 4326);

CREATE OR REPLACE FUNCTION rentrust_sync_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "properties_sync_geom"
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "properties"
  FOR EACH ROW EXECUTE FUNCTION rentrust_sync_geom();

CREATE TRIGGER "localities_sync_geom"
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "localities"
  FOR EACH ROW EXECUTE FUNCTION rentrust_sync_geom();

CREATE TRIGGER "addresses_sync_geom"
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "addresses"
  FOR EACH ROW EXECUTE FUNCTION rentrust_sync_geom();

CREATE INDEX "properties_geom_gist" ON "properties" USING GIST ("geom");
CREATE INDEX "localities_geom_gist" ON "localities" USING GIST ("geom");
CREATE INDEX "addresses_geom_gist" ON "addresses" USING GIST ("geom");

-- ----------------------------------------------------------------------------
-- 2. Trigram indexes for fuzzy / prefix search on names and aliases.
-- ----------------------------------------------------------------------------

CREATE INDEX "properties_canonical_name_trgm"
  ON "properties" USING GIN ("canonical_name" gin_trgm_ops);
CREATE INDEX "properties_display_name_trgm"
  ON "properties" USING GIN ("display_name" gin_trgm_ops);
CREATE INDEX "landlords_display_name_trgm"
  ON "landlords" USING GIN ("display_name" gin_trgm_ops);
CREATE INDEX "localities_name_trgm"
  ON "localities" USING GIN ("name" gin_trgm_ops);

CREATE INDEX "properties_aliases_gin" ON "properties" USING GIN ("aliases");
CREATE INDEX "landlords_aliases_gin" ON "landlords" USING GIN ("aliases");

-- ----------------------------------------------------------------------------
-- 3. Full-text search vector on properties. Also trigger-maintained for the
--    same immutability reason (array_to_string over a column is fine, but we
--    keep all search upkeep in one place for clarity).
-- ----------------------------------------------------------------------------

ALTER TABLE "properties" ADD COLUMN "search_vector" tsvector;

CREATE OR REPLACE FUNCTION rentrust_sync_property_search() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.canonical_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.aliases, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.developer, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "properties_sync_search"
  BEFORE INSERT OR UPDATE OF "display_name", "canonical_name", "aliases", "developer", "description"
  ON "properties"
  FOR EACH ROW EXECUTE FUNCTION rentrust_sync_property_search();

CREATE INDEX "properties_search_vector_gin"
  ON "properties" USING GIN ("search_vector");

-- ----------------------------------------------------------------------------
-- 4. Integrity constraints the ORM cannot express.
-- ----------------------------------------------------------------------------

ALTER TABLE "review_answers"
  ADD CONSTRAINT "review_answers_ratings_1_5" CHECK (
    "management_responsiveness" BETWEEN 1 AND 5 AND
    "maintenance_quality" BETWEEN 1 AND 5 AND
    "communication" BETWEEN 1 AND 5 AND
    "safety" BETWEEN 1 AND 5 AND
    "water_supply" BETWEEN 1 AND 5 AND
    ("internet" IS NULL OR "internet" BETWEEN 1 AND 5) AND
    "noise" BETWEEN 1 AND 5 AND
    "rules_strictness" BETWEEN 1 AND 5
  );

ALTER TABLE "property_scores"
  ADD CONSTRAINT "property_scores_overall_0_100" CHECK ("overall" BETWEEN 0 AND 100),
  ADD CONSTRAINT "property_scores_confidence_0_1" CHECK ("confidence" BETWEEN 0 AND 1),
  ADD CONSTRAINT "property_scores_sample_nonneg" CHECK ("sample_size" >= 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_overall_0_100"
  CHECK ("overall" IS NULL OR "overall" BETWEEN 0 AND 100);

ALTER TABLE "properties"
  ADD CONSTRAINT "properties_year_built_sane"
  CHECK ("year_built" IS NULL OR ("year_built" BETWEEN 1800 AND 2100));

-- ----------------------------------------------------------------------------
-- 5. Partial unique indexes for business rules.
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX "reviews_one_active_per_author_property"
  ON "reviews" ("author_id", "property_id")
  WHERE "deleted_at" IS NULL AND "status" <> 'REMOVED';

CREATE UNIQUE INDEX "claims_one_active_per_claimant_role"
  ON "property_claims" ("property_id", "claimant_id", "role")
  WHERE "status" IN ('PENDING', 'APPROVED');

CREATE UNIQUE INDEX "score_config_single_active"
  ON "score_configurations" ("is_active")
  WHERE "is_active" = true;
