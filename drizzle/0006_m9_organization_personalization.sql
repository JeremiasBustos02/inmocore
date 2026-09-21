ALTER TABLE "organizations" ADD COLUMN "contact_email" text;
ALTER TABLE "organizations" ADD COLUMN "contact_phone" text;
ALTER TABLE "organizations" ADD COLUMN "logo_path" text;
ALTER TABLE "organizations" ADD COLUMN "primary_color" text;
ALTER TABLE "organizations" ADD COLUMN "hero_image_path" text;
ALTER TABLE "organizations" ADD COLUMN "hero_title" text;
ALTER TABLE "organizations" ADD COLUMN "hero_subtitle" text;
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-assets', 'organization-assets', true)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE POLICY "public can read organization assets"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'organization-assets');
--> statement-breakpoint
CREATE POLICY "admins can upload organization assets"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] IN ('logo', 'hero')
  AND storage.extension(name) IN ('jpg', 'png', 'webp')
  AND EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE memberships.organization_id::text = (storage.foldername(name))[1]
      AND memberships.user_id = (SELECT auth.uid())
      AND memberships.role IN ('owner', 'admin')
  )
);
--> statement-breakpoint
CREATE POLICY "admins can delete organization assets"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-assets'
  AND array_length(storage.foldername(name), 1) = 2
  AND (storage.foldername(name))[2] IN ('logo', 'hero')
  AND EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE memberships.organization_id::text = (storage.foldername(name))[1]
      AND memberships.user_id = (SELECT auth.uid())
      AND memberships.role IN ('owner', 'admin')
  )
);
