CREATE TABLE "property_images" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "alt_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "property_images_storage_key_key" ON "property_images"("storage_key");
CREATE INDEX "property_images_property_id_created_at_idx" ON "property_images"("property_id", "created_at");

ALTER TABLE "property_images"
ADD CONSTRAINT "property_images_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
