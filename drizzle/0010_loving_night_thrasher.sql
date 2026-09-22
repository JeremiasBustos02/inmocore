CREATE TYPE "public"."location_visibility" AS ENUM('exact', 'approximate', 'hidden');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_latitude" double precision;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contact_longitude" double precision;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "location_visibility" "location_visibility" DEFAULT 'exact' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_contact_coordinates_complete" CHECK (("organizations"."contact_latitude" is null and "organizations"."contact_longitude" is null) or ("organizations"."contact_latitude" is not null and "organizations"."contact_longitude" is not null));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_contact_latitude_valid" CHECK ("organizations"."contact_latitude" is null or "organizations"."contact_latitude" between -90 and 90);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_contact_longitude_valid" CHECK ("organizations"."contact_longitude" is null or "organizations"."contact_longitude" between -180 and 180);--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_coordinates_complete" CHECK (("properties"."latitude" is null and "properties"."longitude" is null) or ("properties"."latitude" is not null and "properties"."longitude" is not null));--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_latitude_valid" CHECK ("properties"."latitude" is null or "properties"."latitude" between -90 and 90);--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_longitude_valid" CHECK ("properties"."longitude" is null or "properties"."longitude" between -180 and 180);