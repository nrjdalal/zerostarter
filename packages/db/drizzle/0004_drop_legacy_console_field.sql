UPDATE "user" SET "role" = 'admin' WHERE "console" IS NOT NULL AND "console" <> '';--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "console";