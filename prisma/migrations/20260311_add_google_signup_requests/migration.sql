CREATE TYPE "SignupProvider" AS ENUM ('google');

CREATE TABLE "signup_requests" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "full_name" TEXT,
  "provider" "SignupProvider" NOT NULL,
  "supabase_user_id" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "signup_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "signup_requests_email_key" ON "signup_requests"("email");
CREATE UNIQUE INDEX "signup_requests_supabase_user_id_key" ON "signup_requests"("supabase_user_id");
CREATE INDEX "signup_requests_status_created_at_idx" ON "signup_requests"("status", "created_at");

ALTER TABLE "signup_requests"
ADD CONSTRAINT "signup_requests_reviewed_by_fkey"
FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
