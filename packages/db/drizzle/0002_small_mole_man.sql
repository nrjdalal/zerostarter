CREATE TABLE "allowlist" (
	"id" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "allowlist_value_unique" UNIQUE("value")
);
--> statement-breakpoint
ALTER TABLE "allowlist" ADD CONSTRAINT "allowlist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allowlist_createdBy_idx" ON "allowlist" USING btree ("created_by");