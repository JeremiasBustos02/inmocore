ALTER TABLE "organizations" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "site_variant" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_custom_domain_unique" UNIQUE("custom_domain");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_custom_domain_normalized" CHECK ("organizations"."custom_domain" is null or (
        "organizations"."custom_domain" = lower("organizations"."custom_domain")
        and "organizations"."custom_domain" ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
        and length("organizations"."custom_domain") <= 253
      ));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_site_variant_valid" CHECK ("organizations"."site_variant" in ('default', 'editorial'));