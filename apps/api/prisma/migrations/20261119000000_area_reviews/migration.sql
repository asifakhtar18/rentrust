CREATE TABLE "locality_reviews" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "locality_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
  "tenure" "TenureBucket" NOT NULL,
  "overall" DOUBLE PRECISION,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "locality_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "locality_reviews_locality_id_fkey"
    FOREIGN KEY ("locality_id") REFERENCES "localities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "locality_reviews_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "locality_reviews_overall_range" CHECK ("overall" IS NULL OR ("overall" >= 1 AND "overall" <= 5))
);

CREATE INDEX "locality_reviews_locality_id_status_published_at_idx"
  ON "locality_reviews"("locality_id", "status", "published_at");
CREATE INDEX "locality_reviews_author_id_created_at_idx"
  ON "locality_reviews"("author_id", "created_at");
CREATE UNIQUE INDEX "locality_reviews_one_active_per_author_idx"
  ON "locality_reviews"("locality_id", "author_id")
  WHERE "deleted_at" IS NULL AND "status" <> 'REMOVED';

CREATE TABLE "locality_review_answers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "review_id" UUID NOT NULL,
  "municipal_services" INTEGER NOT NULL,
  "public_transport" INTEGER NOT NULL,
  "healthcare_access" INTEGER NOT NULL,
  "food_and_groceries" INTEGER NOT NULL,
  "safety" INTEGER NOT NULL,
  "cleanliness" INTEGER NOT NULL,
  "neighbourliness" INTEGER NOT NULL,
  "comments" VARCHAR(2000),
  CONSTRAINT "locality_review_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "locality_review_answers_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "locality_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "locality_review_answers_review_id_key" UNIQUE ("review_id"),
  CONSTRAINT "locality_review_answers_rating_range" CHECK (
    "municipal_services" BETWEEN 1 AND 5 AND "public_transport" BETWEEN 1 AND 5 AND
    "healthcare_access" BETWEEN 1 AND 5 AND "food_and_groceries" BETWEEN 1 AND 5 AND
    "safety" BETWEEN 1 AND 5 AND "cleanliness" BETWEEN 1 AND 5 AND "neighbourliness" BETWEEN 1 AND 5
  )
);
