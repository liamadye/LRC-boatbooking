ALTER TABLE "bookings"
ADD COLUMN "start_minutes" INTEGER,
ADD COLUMN "end_minutes" INTEGER;

UPDATE "bookings"
SET
  "start_minutes" = CASE
    WHEN "start_slot" = 7 AND NULLIF(TRIM(SPLIT_PART(COALESCE("notes", ''), ' - ', 1)), '') IS NOT NULL THEN
      CASE TRIM(SPLIT_PART("notes", ' - ', 1))
        WHEN '8:00am' THEN 480
        WHEN '8:30am' THEN 510
        WHEN '9:00am' THEN 540
        WHEN '9:30am' THEN 570
        WHEN '10:00am' THEN 600
        WHEN '10:30am' THEN 630
        WHEN '11:00am' THEN 660
        WHEN '11:30am' THEN 690
        WHEN '12:00pm' THEN 720
        WHEN '12:30pm' THEN 750
        WHEN '1:00pm' THEN 780
        WHEN '1:30pm' THEN 810
        WHEN '2:00pm' THEN 840
        WHEN '2:30pm' THEN 870
        WHEN '3:00pm' THEN 900
        WHEN '3:30pm' THEN 930
        WHEN '4:00pm' THEN 960
        WHEN '4:30pm' THEN 990
        ELSE 480
      END
    ELSE CASE "start_slot"
      WHEN 1 THEN 300
      WHEN 2 THEN 330
      WHEN 3 THEN 360
      WHEN 4 THEN 390
      WHEN 5 THEN 420
      WHEN 6 THEN 450
      WHEN 7 THEN 480
      WHEN 8 THEN 990
      WHEN 9 THEN 1095
      ELSE 0
    END
  END,
  "end_minutes" = CASE
    WHEN "end_slot" = 7 AND NULLIF(TRIM(SPLIT_PART(COALESCE("notes", ''), ' - ', 2)), '') IS NOT NULL THEN
      CASE TRIM(SPLIT_PART("notes", ' - ', 2))
        WHEN '8:00am' THEN 480
        WHEN '8:30am' THEN 510
        WHEN '9:00am' THEN 540
        WHEN '9:30am' THEN 570
        WHEN '10:00am' THEN 600
        WHEN '10:30am' THEN 630
        WHEN '11:00am' THEN 660
        WHEN '11:30am' THEN 690
        WHEN '12:00pm' THEN 720
        WHEN '12:30pm' THEN 750
        WHEN '1:00pm' THEN 780
        WHEN '1:30pm' THEN 810
        WHEN '2:00pm' THEN 840
        WHEN '2:30pm' THEN 870
        WHEN '3:00pm' THEN 900
        WHEN '3:30pm' THEN 930
        WHEN '4:00pm' THEN 960
        WHEN '4:30pm' THEN 990
        ELSE 990
      END
    ELSE CASE "end_slot"
      WHEN 1 THEN 330
      WHEN 2 THEN 360
      WHEN 3 THEN 390
      WHEN 4 THEN 420
      WHEN 5 THEN 450
      WHEN 6 THEN 480
      WHEN 7 THEN 990
      WHEN 8 THEN 1080
      WHEN 9 THEN 1260
      ELSE 1260
    END
  END;

ALTER TABLE "bookings"
ALTER COLUMN "start_minutes" SET NOT NULL,
ALTER COLUMN "end_minutes" SET NOT NULL;

ALTER TABLE "bookings"
DROP CONSTRAINT IF EXISTS "bookings_date_boat_id_start_slot_key",
DROP CONSTRAINT IF EXISTS "bookings_date_equipment_id_start_slot_key",
DROP CONSTRAINT IF EXISTS "bookings_date_oar_set_id_start_slot_key";

CREATE INDEX IF NOT EXISTS "bookings_date_boat_id_start_minutes_idx"
ON "bookings"("date", "boat_id", "start_minutes");

CREATE INDEX IF NOT EXISTS "bookings_date_equipment_id_start_minutes_idx"
ON "bookings"("date", "equipment_id", "start_minutes");

CREATE INDEX IF NOT EXISTS "bookings_date_oar_set_id_start_minutes_idx"
ON "bookings"("date", "oar_set_id", "start_minutes");
