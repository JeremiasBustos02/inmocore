import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  authenticatedRole,
  authUid,
  authUsers,
} from "drizzle-orm/supabase";

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "agent",
]);

export const operationTypes = ["sale", "rent"] as const;
export const propertyTypes = [
  "house",
  "apartment",
  "land",
  "commercial",
  "office",
  "country_house",
  "garage",
  "other",
] as const;
export const propertyStatuses = [
  "draft",
  "available",
  "reserved",
  "sold",
  "rented",
  "archived",
] as const;
export const currencies = ["ARS", "USD"] as const;

export const operationType = pgEnum("operation_type", operationTypes);
export const propertyType = pgEnum("property_type", propertyTypes);
export const propertyStatus = pgEnum("property_status", propertyStatuses);
export const propertyCurrency = pgEnum("currency", currencies);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    whatsappPhone: text("whatsapp_phone"),
    contactAddress: text("contact_address"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    logoPath: text("logo_path"),
    primaryColor: text("primary_color"),
    heroImagePath: text("hero_image_path"),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    pgPolicy("members can read organizations", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1
        from memberships
        where memberships.organization_id = ${table.id}
          and memberships.user_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

export const memberships = pgTable(
  "memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("memberships_user_id_idx").on(table.userId),
    pgPolicy("users can read own memberships", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
  ],
).enableRLS();

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    operationType: operationType("operation_type").notNull(),
    propertyType: propertyType("property_type").notNull(),
    status: propertyStatus("status").notNull(),
    priceAmount: bigint("price_amount", { mode: "number" }),
    currency: propertyCurrency("currency"),
    address: text("address"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    country: text("country").default("Argentina").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    rooms: integer("rooms"),
    garageSpaces: integer("garage_spaces"),
    coveredAreaM2: integer("covered_area_m2"),
    totalAreaM2: integer("total_area_m2"),
    isPublished: boolean("is_published").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("properties_organization_reference_unique").on(
      table.organizationId,
      table.reference,
    ),
    index("properties_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    index("properties_organization_published_idx").on(
      table.organizationId,
      table.isPublished,
    ),
    check(
      "properties_bedrooms_non_negative",
      sql`${table.bedrooms} >= 0`,
    ),
    check(
      "properties_bathrooms_non_negative",
      sql`${table.bathrooms} >= 0`,
    ),
    check("properties_rooms_non_negative", sql`${table.rooms} >= 0`),
    check(
      "properties_garage_spaces_non_negative",
      sql`${table.garageSpaces} >= 0`,
    ),
    check(
      "properties_covered_area_positive",
      sql`${table.coveredAreaM2} > 0`,
    ),
    check(
      "properties_total_area_positive",
      sql`${table.totalAreaM2} > 0`,
    ),
    check(
      "properties_price_amount_non_negative",
      sql`${table.priceAmount} >= 0`,
    ),
    pgPolicy("members can read properties", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1
        from memberships
        where memberships.organization_id = ${table.organizationId}
          and memberships.user_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

export const propertyImages = pgTable(
  "property_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull().unique(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("property_images_property_order_idx").on(
      table.propertyId,
      table.sortOrder,
    ),
    check(
      "property_images_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`,
    ),
    pgPolicy("members can read property images", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1
        from properties
        inner join memberships
          on memberships.organization_id = properties.organization_id
        where properties.id = ${table.propertyId}
          and memberships.user_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();
