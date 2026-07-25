CREATE TABLE "job_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"location" text,
	"url" text NOT NULL,
	"description" text,
	"posted_at" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_recommendations" ADD CONSTRAINT "job_recommendations_analysis_id_cv_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."cv_analyses"("id") ON DELETE cascade ON UPDATE no action;