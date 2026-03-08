ALTER TABLE "bookings"
ADD COLUMN "squad_id" TEXT;

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_squad_id_fkey"
FOREIGN KEY ("squad_id") REFERENCES "squads"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "bookings_squad_id_idx" ON "bookings"("squad_id");

CREATE TABLE "invitation_squads" (
  "invitation_id" TEXT NOT NULL,
  "squad_id" TEXT NOT NULL,
  CONSTRAINT "invitation_squads_pkey" PRIMARY KEY ("invitation_id", "squad_id"),
  CONSTRAINT "invitation_squads_invitation_id_fkey"
    FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT "invitation_squads_squad_id_fkey"
    FOREIGN KEY ("squad_id") REFERENCES "squads"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
