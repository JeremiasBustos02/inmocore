ALTER TABLE "properties" ALTER COLUMN "reference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "property_code_prefix" text DEFAULT 'PROP' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "property_code_sequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "property_code" text;--> statement-breakpoint
UPDATE "organizations"
SET "property_code_prefix" = CASE
  WHEN length(regexp_replace("slug", '[^a-zA-Z0-9]', '', 'g')) = 0 THEN 'PROP'
  ELSE rpad(upper(left(regexp_replace("slug", '[^a-zA-Z0-9]', '', 'g'), 5)), 3, 'X')
END;--> statement-breakpoint
WITH numbered_properties AS (
  SELECT
    properties.id,
    organizations.property_code_prefix,
    row_number() OVER (
      PARTITION BY properties.organization_id
      ORDER BY properties.created_at, properties.id
    ) AS sequence_number
  FROM properties
  INNER JOIN organizations ON organizations.id = properties.organization_id
)
UPDATE "properties"
SET "property_code" = numbered_properties.property_code_prefix || '-' || lpad(numbered_properties.sequence_number::text, 4, '0')
FROM numbered_properties
WHERE properties.id = numbered_properties.id;--> statement-breakpoint
UPDATE "organizations"
SET "property_code_sequence" = counts.sequence_number
FROM (
  SELECT organization_id, count(*)::integer AS sequence_number
  FROM properties
  GROUP BY organization_id
) AS counts
WHERE organizations.id = counts.organization_id;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "property_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_property_code_unique" UNIQUE("organization_id","property_code");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_property_code_prefix_valid" CHECK ("organizations"."property_code_prefix" ~ '^[A-Z0-9]{3,5}$');--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_property_code_sequence_non_negative" CHECK ("organizations"."property_code_sequence" >= 0);
