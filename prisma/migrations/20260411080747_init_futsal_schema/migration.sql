-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "courts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "slots" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "bookings" RENAME CONSTRAINT "fk_bookings_court" TO "bookings_court_id_fkey";

-- RenameForeignKey
ALTER TABLE "bookings" RENAME CONSTRAINT "fk_bookings_slot" TO "bookings_slot_id_fkey";

-- RenameForeignKey
ALTER TABLE "bookings" RENAME CONSTRAINT "fk_bookings_user" TO "bookings_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "courts" RENAME CONSTRAINT "fk_courts_owner" TO "courts_owner_id_fkey";

-- RenameForeignKey
ALTER TABLE "slots" RENAME CONSTRAINT "fk_slots_court" TO "slots_court_id_fkey";
