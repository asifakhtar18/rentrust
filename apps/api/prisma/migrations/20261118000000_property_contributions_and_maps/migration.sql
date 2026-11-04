ALTER TABLE "properties"
  ADD COLUMN "google_maps_url" VARCHAR(2048);

CREATE TYPE "PropertyContributionKind" AS ENUM ('ADD_PROPERTY', 'EDIT_PROPERTY', 'ADD_PHOTO');
CREATE TYPE "PropertyContributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "property_contributions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "submitter_id" UUID NOT NULL,
  "property_id" UUID,
  "kind" "PropertyContributionKind" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "PropertyContributionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewer_id" UUID,
  "moderator_note" VARCHAR(1000),
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "property_contributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_contributions_submitter_id_fkey"
    FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "property_contributions_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "property_contributions_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "property_contributions_status_created_at_idx"
  ON "property_contributions"("status", "created_at");
CREATE INDEX "property_contributions_submitter_id_created_at_idx"
  ON "property_contributions"("submitter_id", "created_at");
CREATE INDEX "property_contributions_property_id_created_at_idx"
  ON "property_contributions"("property_id", "created_at");
