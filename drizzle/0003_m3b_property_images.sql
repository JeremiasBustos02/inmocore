CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_images_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "property_images_sort_order_non_negative" CHECK ("property_images"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "property_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "property_images_property_order_idx" ON "property_images" USING btree ("property_id","sort_order");--> statement-breakpoint
CREATE POLICY "members can read property images" ON "property_images" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1
        from properties
        inner join memberships
          on memberships.organization_id = properties.organization_id
        where properties.id = "property_images"."property_id"
          and memberships.user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "members can upload property images"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
	bucket_id = 'property-images'
	and array_length(storage.foldername(name), 1) = 2
	and exists (
		select 1
		from public.properties
		inner join public.memberships
			on memberships.organization_id = properties.organization_id
		where memberships.user_id = (select auth.uid())
			and properties.organization_id::text = (storage.foldername(name))[1]
			and properties.id::text = (storage.foldername(name))[2]
	)
);--> statement-breakpoint
CREATE POLICY "members can delete property images"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
	bucket_id = 'property-images'
	and array_length(storage.foldername(name), 1) = 2
	and exists (
		select 1
		from public.properties
		inner join public.memberships
			on memberships.organization_id = properties.organization_id
		where memberships.user_id = (select auth.uid())
			and properties.organization_id::text = (storage.foldername(name))[1]
			and properties.id::text = (storage.foldername(name))[2]
	)
);
