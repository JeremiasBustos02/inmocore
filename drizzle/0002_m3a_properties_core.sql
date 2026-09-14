CREATE TYPE "public"."operation_type" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('ARS', 'USD');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('draft', 'available', 'reserved', 'sold', 'rented', 'archived');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'apartment', 'land', 'commercial', 'office', 'country_house', 'garage', 'other');--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"operation_type" "operation_type" NOT NULL,
	"property_type" "property_type" NOT NULL,
	"status" "property_status" NOT NULL,
	"price_amount" bigint,
	"currency" "currency",
	"address" text,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"country" text DEFAULT 'Argentina' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"bedrooms" integer,
	"bathrooms" integer,
	"rooms" integer,
	"garage_spaces" integer,
	"covered_area_m2" integer,
	"total_area_m2" integer,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_organization_reference_unique" UNIQUE("organization_id","reference"),
	CONSTRAINT "properties_bedrooms_non_negative" CHECK ("properties"."bedrooms" >= 0),
	CONSTRAINT "properties_bathrooms_non_negative" CHECK ("properties"."bathrooms" >= 0),
	CONSTRAINT "properties_rooms_non_negative" CHECK ("properties"."rooms" >= 0),
	CONSTRAINT "properties_garage_spaces_non_negative" CHECK ("properties"."garage_spaces" >= 0),
	CONSTRAINT "properties_covered_area_positive" CHECK ("properties"."covered_area_m2" > 0),
	CONSTRAINT "properties_total_area_positive" CHECK ("properties"."total_area_m2" > 0),
	CONSTRAINT "properties_price_amount_non_negative" CHECK ("properties"."price_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "properties_organization_status_idx" ON "properties" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "properties_organization_published_idx" ON "properties" USING btree ("organization_id","is_published");--> statement-breakpoint
CREATE POLICY "members can read properties" ON "properties" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from memberships
        where memberships.organization_id = "properties"."organization_id"
          and memberships.user_id = (select auth.uid())
      ));