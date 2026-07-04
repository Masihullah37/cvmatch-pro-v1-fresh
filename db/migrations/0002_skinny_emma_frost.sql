CREATE TYPE "public"."credit_reason" AS ENUM('purchase', 'manual_download', 'ai_generation', 'admin_grant', 'refund');--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"amount" integer NOT NULL,
	"reason" "credit_reason" NOT NULL,
	"reference_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"type" varchar NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"skipped_reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"scans_completed_count" integer NOT NULL,
	"cycle_ended_at" timestamp DEFAULT now(),
	"plan_at_that_time" varchar,
	"usage_type" varchar DEFAULT 'ats_scan'
);
--> statement-breakpoint
CREATE TABLE "user_template_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"template_id" uuid NOT NULL,
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cv_analyses" DROP CONSTRAINT "cv_analyses_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cv_generations" DROP CONSTRAINT "cv_generations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cv_analyses" ALTER COLUMN "detected_platform" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "cv_analyses" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "cv_analyses" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cookie_consent" varchar DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cookie_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_template_unlocks" ADD CONSTRAINT "user_template_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_template_unlocks" ADD CONSTRAINT "user_template_unlocks_template_id_cv_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."cv_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_analyses" ADD CONSTRAINT "cv_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_generations" ADD CONSTRAINT "cv_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;