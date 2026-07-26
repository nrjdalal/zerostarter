CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allowlist" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor" text,
	"value" text NOT NULL,
	"kind" text GENERATED ALWAYS AS (case when "value" like '@%' then 'domain' else 'email' end) STORED NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "allowlist_value_unique" UNIQUE("value")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role_set_at" timestamp;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowlist" ADD CONSTRAINT "allowlist_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;