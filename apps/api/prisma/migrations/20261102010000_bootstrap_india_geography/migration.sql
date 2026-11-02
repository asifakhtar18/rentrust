-- Bootstrap production geography used by the admin city-creation workflow.
-- The development seed also creates fictional properties and reviews, so it
-- must not be run against a production database just to add these references.
-- State and union-territory names follow the National Portal of India list:
-- https://www.india.gov.in/calendar

INSERT INTO "countries" ("id", "name", "iso2")
VALUES (uuid_generate_v4(), 'India', 'IN')
ON CONFLICT ("iso2") DO NOTHING;

INSERT INTO "states" ("id", "country_id", "name", "code")
SELECT uuid_generate_v4(), country.id, state.name, state.code
FROM "countries" AS country
CROSS JOIN (VALUES
  ('Andhra Pradesh', 'AP'),
  ('Arunachal Pradesh', 'AR'),
  ('Assam', 'AS'),
  ('Bihar', 'BR'),
  ('Chhattisgarh', 'CG'),
  ('Goa', 'GA'),
  ('Gujarat', 'GJ'),
  ('Haryana', 'HR'),
  ('Himachal Pradesh', 'HP'),
  ('Jharkhand', 'JH'),
  ('Karnataka', 'KA'),
  ('Kerala', 'KL'),
  ('Madhya Pradesh', 'MP'),
  ('Maharashtra', 'MH'),
  ('Manipur', 'MN'),
  ('Meghalaya', 'ML'),
  ('Mizoram', 'MZ'),
  ('Nagaland', 'NL'),
  ('Odisha', 'OD'),
  ('Punjab', 'PB'),
  ('Rajasthan', 'RJ'),
  ('Sikkim', 'SK'),
  ('Tamil Nadu', 'TN'),
  ('Telangana', 'TG'),
  ('Tripura', 'TR'),
  ('Uttar Pradesh', 'UP'),
  ('Uttarakhand', 'UK'),
  ('West Bengal', 'WB'),
  ('Andaman and Nicobar Islands', 'AN'),
  ('Chandigarh', 'CH'),
  ('Dadra and Nagar Haveli and Daman and Diu', 'DH'),
  ('Delhi', 'DL'),
  ('Jammu and Kashmir', 'JK'),
  ('Ladakh', 'LA'),
  ('Lakshadweep', 'LD'),
  ('Puducherry', 'PY')
) AS state(name, code)
WHERE country."iso2" = 'IN'
ON CONFLICT ("country_id", "name") DO NOTHING;
