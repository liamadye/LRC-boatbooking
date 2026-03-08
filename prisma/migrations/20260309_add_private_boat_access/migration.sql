-- CreateTable
CREATE TABLE "private_boat_access" (
    "boat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "private_boat_access_pkey" PRIMARY KEY ("boat_id","user_id")
);

-- AddForeignKey
ALTER TABLE "private_boat_access" ADD CONSTRAINT "private_boat_access_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_boat_access" ADD CONSTRAINT "private_boat_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
