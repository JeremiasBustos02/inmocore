ALTER TABLE "organizations" ADD COLUMN "about_eyebrow" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "about_title" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "about_description" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "about_image_path" text;--> statement-breakpoint
ALTER POLICY "admins can upload organization assets" ON storage.objects
WITH CHECK (
  bucket_id = 'organization-assets'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] IN ('logo', 'hero', 'about')
  AND storage.extension(name) IN ('jpg', 'png', 'webp')
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.organization_id::text = (storage.foldername(name))[1]
      AND memberships.user_id = (SELECT auth.uid())
      AND memberships.role IN ('owner', 'admin')
  )
);--> statement-breakpoint
ALTER POLICY "admins can delete organization assets" ON storage.objects
USING (
  bucket_id = 'organization-assets'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] IN ('logo', 'hero', 'about')
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.organization_id::text = (storage.foldername(name))[1]
      AND memberships.user_id = (SELECT auth.uid())
      AND memberships.role IN ('owner', 'admin')
  )
);
