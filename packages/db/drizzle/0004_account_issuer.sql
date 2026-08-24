ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account" SET "issuer" = CASE "provider_id" WHEN 'google' THEN 'https://accounts.google.com' WHEN 'credential' THEN 'local:credential' ELSE 'local:oauth:' || "provider_id" END WHERE "issuer" IS NULL;--> statement-breakpoint
ALTER TABLE "team" ADD COLUMN "member_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "team" SET "member_count" = (SELECT count(*) FROM "team_member" WHERE "team_member"."team_id" = "team"."id");--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "membership_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_membership_key_unique" UNIQUE("membership_key");
