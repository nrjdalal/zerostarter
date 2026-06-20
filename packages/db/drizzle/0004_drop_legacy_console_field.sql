UPDATE "user" SET "role" = 'admin' WHERE "console" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "console";