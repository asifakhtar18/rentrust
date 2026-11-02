-- Bootstrap the same reference data that ReferenceDataService creates when
-- application starts. Migrations keep first-time provisioning deterministic
-- across local and Vercel environments.

INSERT INTO "review_categories" ("id", "key", "label", "display_order", "is_active")
VALUES
  (uuid_generate_v4(), 'management', 'Management', 0, true),
  (uuid_generate_v4(), 'maintenance', 'Maintenance', 1, true),
  (uuid_generate_v4(), 'deposit', 'Deposit Experience', 2, true),
  (uuid_generate_v4(), 'communication', 'Communication', 3, true),
  (uuid_generate_v4(), 'safety', 'Safety', 4, true),
  (uuid_generate_v4(), 'condition', 'Property Condition', 5, true),
  (uuid_generate_v4(), 'rules', 'Rules Transparency', 6, true),
  (uuid_generate_v4(), 'experience', 'Living Experience', 7, true)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "display_order" = EXCLUDED."display_order";

INSERT INTO "score_configurations" ("id", "name", "is_active", "weights")
SELECT
  uuid_generate_v4(),
  'default-v1',
  NOT EXISTS (SELECT 1 FROM "score_configurations" WHERE "is_active" = true),
  '{"management":0.25,"maintenance":0.15,"deposit":0.1,"communication":0.1,"safety":0.1,"condition":0.1,"rules":0.1,"experience":0.1}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM "score_configurations" WHERE "name" = 'default-v1'
);
