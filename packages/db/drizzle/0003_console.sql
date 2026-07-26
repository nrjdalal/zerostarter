CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allowlist" RENAME COLUMN "created_by" TO "actor_id";--> statement-breakpoint
ALTER TABLE "allowlist" DROP CONSTRAINT "allowlist_created_by_user_id_fk";
--> statement-breakpoint
DROP INDEX "user_role_idx";--> statement-breakpoint
ALTER TABLE "allowlist" ADD COLUMN "actor" text;--> statement-breakpoint
UPDATE "allowlist" SET "actor" = "user"."email" FROM "user" WHERE "user"."id" = "allowlist"."actor_id";--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowlist" ADD CONSTRAINT "allowlist_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;