CREATE TYPE "LocalitySuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "locality_suggestions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "city_id" UUID NOT NULL,
    "submitter_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "google_maps_url" VARCHAR(2048),
    "status" "LocalitySuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" UUID,
    "moderator_note" VARCHAR(1000),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "locality_suggestions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "locality_suggestions_city_id_fkey"
      FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "locality_suggestions_submitter_id_fkey"
      FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "locality_suggestions_reviewer_id_fkey"
      FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "locality_suggestions_latitude_range" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
    CONSTRAINT "locality_suggestions_longitude_range" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)),
    CONSTRAINT "locality_suggestions_coordinate_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL))
);

CREATE INDEX "locality_suggestions_status_created_at_idx" ON "locality_suggestions"("status", "created_at");
CREATE INDEX "locality_suggestions_city_id_created_at_idx" ON "locality_suggestions"("city_id", "created_at");
CREATE UNIQUE INDEX "locality_suggestions_one_pending_name_per_city_idx"
  ON "locality_suggestions"("city_id", "normalized_name") WHERE "status" = 'PENDING';
