CREATE TYPE "BoatClass" AS ENUM ('eight', 'four', 'pair', 'single', 'tinny');

ALTER TABLE "boats"
ADD COLUMN "boat_class" "BoatClass",
ADD COLUMN "supports_sweep" BOOLEAN,
ADD COLUMN "supports_scull" BOOLEAN,
ADD COLUMN "is_coxed" BOOLEAN;

UPDATE "boats"
SET
  "boat_class" = CASE
    WHEN "category" = 'tinny' OR LOWER("boat_type") = 'tinny' THEN 'tinny'::"BoatClass"
    WHEN "boat_type" LIKE '8%' THEN 'eight'::"BoatClass"
    WHEN "boat_type" LIKE '4%' THEN 'four'::"BoatClass"
    WHEN "boat_type" LIKE '2%' THEN 'pair'::"BoatClass"
    ELSE 'single'::"BoatClass"
  END,
  "supports_sweep" = CASE
    WHEN "category" = 'tinny' OR LOWER("boat_type") = 'tinny' THEN FALSE
    WHEN "boat_type" LIKE '8%' THEN TRUE
    WHEN "boat_type" LIKE '4%' THEN POSITION('-' IN "boat_type") > 0 OR POSITION('+' IN "boat_type") > 0
    WHEN "boat_type" LIKE '2%' THEN POSITION('-' IN "boat_type") > 0 OR POSITION('+' IN "boat_type") > 0
    ELSE FALSE
  END,
  "supports_scull" = CASE
    WHEN "category" = 'tinny' OR LOWER("boat_type") = 'tinny' THEN FALSE
    WHEN "boat_type" LIKE '1%' THEN TRUE
    ELSE POSITION('x' IN LOWER("boat_type")) > 0
  END,
  "is_coxed" = CASE
    WHEN "category" = 'tinny' OR LOWER("boat_type") = 'tinny' THEN FALSE
    WHEN "boat_type" LIKE '8%' THEN TRUE
    WHEN "boat_type" LIKE '4%' THEN POSITION('+' IN "boat_type") > 0
    ELSE FALSE
  END;

UPDATE "boats"
SET "boat_type" = CASE
  WHEN "boat_class" = 'eight' THEN '8+'
  WHEN "boat_class" = 'single' THEN '1x'
  WHEN "boat_class" = 'tinny' THEN 'tinny'
  WHEN "boat_class" = 'pair' AND "supports_scull" = TRUE AND "supports_sweep" = TRUE THEN '2x/-'
  WHEN "boat_class" = 'pair' AND "supports_scull" = TRUE THEN '2x'
  WHEN "boat_class" = 'pair' THEN '2-'
  WHEN "boat_class" = 'four' AND "supports_scull" = TRUE AND "supports_sweep" = TRUE AND "is_coxed" = TRUE THEN '4x/+'
  WHEN "boat_class" = 'four' AND "supports_scull" = TRUE AND "supports_sweep" = TRUE THEN '4x/-'
  WHEN "boat_class" = 'four' AND "supports_scull" = TRUE AND "is_coxed" = TRUE THEN '4x+'
  WHEN "boat_class" = 'four' AND "supports_scull" = TRUE THEN '4x'
  WHEN "boat_class" = 'four' AND "is_coxed" = TRUE THEN '4+'
  WHEN "boat_class" = 'four' THEN '4-'
  ELSE "boat_type"
END;

ALTER TABLE "boats"
ALTER COLUMN "boat_class" SET NOT NULL,
ALTER COLUMN "supports_sweep" SET NOT NULL,
ALTER COLUMN "supports_scull" SET NOT NULL,
ALTER COLUMN "is_coxed" SET NOT NULL,
ALTER COLUMN "boat_class" SET DEFAULT 'single',
ALTER COLUMN "supports_sweep" SET DEFAULT FALSE,
ALTER COLUMN "supports_scull" SET DEFAULT FALSE,
ALTER COLUMN "is_coxed" SET DEFAULT FALSE;
