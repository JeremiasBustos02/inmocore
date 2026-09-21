import { cache } from "react";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  operationTypes,
  organizations,
  properties,
  propertyImages,
  propertyTypes,
} from "@/db/schema";
import { PROPERTY_IMAGES_BUCKET } from "@/lib/property-images";

export type PublicProperty = {
  id: string;
  title: string;
  operationType: "sale" | "rent";
  propertyType:
    | "house"
    | "apartment"
    | "land"
    | "commercial"
    | "office"
    | "country_house"
    | "garage"
    | "other";
  priceAmount: number | null;
  currency: "ARS" | "USD" | null;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  totalAreaM2: number | null;
  coverUrl: string | null;
};

export type PublicPropertyFilters = {
  operation?: (typeof operationTypes)[number];
  type?: (typeof propertyTypes)[number];
  city?: string;
  price?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  sort: "newest" | "price_asc" | "price_desc";
  page: number;
};

export type PublicPropertyDetail = Omit<PublicProperty, "coverUrl"> & {
  reference: string;
  description: string | null;
  address: string | null;
  province: string;
  country: string;
  rooms: number | null;
  garageSpaces: number | null;
  coveredAreaM2: number | null;
  images: Array<{ id: string; url: string }>;
};

export const PUBLIC_PROPERTIES_PAGE_SIZE = 12;

type PublicSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, maximum: number) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : undefined;
}

function parseHumanPrice(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= Number.MAX_SAFE_INTEGER / 100
    ? parsed
    : undefined;
}

export function parsePublicPropertyFilters(
  searchParams: PublicSearchParams,
): PublicPropertyFilters {
  const operation = firstValue(searchParams.operation);
  const type = firstValue(searchParams.type);
  const city = firstValue(searchParams.city)?.trim();
  const price = firstValue(searchParams.price);
  const sort = firstValue(searchParams.sort);

  return {
    operation: operationTypes.includes(operation as (typeof operationTypes)[number])
      ? (operation as (typeof operationTypes)[number])
      : undefined,
    type: propertyTypes.includes(type as (typeof propertyTypes)[number])
      ? (type as (typeof propertyTypes)[number])
      : undefined,
    city: city ? city.slice(0, 120) : undefined,
    price: /^(50000|100000|150000|250000|over-250000)$/.test(price ?? "")
      ? price
      : undefined,
    priceMin: parseHumanPrice(firstValue(searchParams.priceMin)),
    priceMax: parseHumanPrice(firstValue(searchParams.priceMax)),
    bedrooms: parsePositiveInteger(firstValue(searchParams.bedrooms), 20),
    bathrooms: parsePositiveInteger(firstValue(searchParams.bathrooms), 20),
    sort:
      sort === "price_asc" || sort === "price_desc" || sort === "newest"
        ? sort
        : "newest",
    page: parsePositiveInteger(firstValue(searchParams.page), 100_000) ?? 1,
  };
}

export function publicFiltersToSearchParams(
  filters: PublicPropertyFilters,
  page?: number,
) {
  const params = new URLSearchParams();

  if (filters.operation) params.set("operation", filters.operation);
  if (filters.type) params.set("type", filters.type);
  if (filters.city) params.set("city", filters.city);
  if (filters.price) params.set("price", filters.price);
  if (filters.priceMin !== undefined) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set("priceMax", String(filters.priceMax));
  if (filters.bedrooms !== undefined) params.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms !== undefined) params.set("bathrooms", String(filters.bathrooms));
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (page && page > 1) params.set("page", String(page));

  return params;
}

export const getPublicOrganization = cache(async (organizationSlug: string) => {
  const [organization] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug))
    .limit(1);

  return organization ?? null;
});

export async function getPublicOrganizations() {
  return db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .orderBy(asc(organizations.slug));
}

function getPublicImageUrl(storagePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to load property images.");
  }

  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return new URL(
    `/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/${encodedPath}`,
    supabaseUrl,
  ).toString();
}

function publicPropertyConditions(organizationId: string): SQL[] {
  return [
    eq(properties.organizationId, organizationId),
    eq(properties.isPublished, true),
    ne(properties.status, "draft"),
    ne(properties.status, "archived"),
  ];
}

export async function getPublicHomeData(organizationId: string) {
  const propertyList = await db
    .select({
      id: properties.id,
      title: properties.title,
      operationType: properties.operationType,
      propertyType: properties.propertyType,
      priceAmount: properties.priceAmount,
      currency: properties.currency,
      city: properties.city,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      totalAreaM2: properties.totalAreaM2,
    })
    .from(properties)
    .where(
      and(
        ...publicPropertyConditions(organizationId),
      ),
    )
    .orderBy(desc(properties.isFeatured), desc(properties.createdAt), asc(properties.id))
    .limit(6);

  if (propertyList.length === 0) return [];

  const images = await db
    .select({
      propertyId: propertyImages.propertyId,
      storagePath: propertyImages.storagePath,
    })
    .from(propertyImages)
    .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
    .where(
      and(
        ...publicPropertyConditions(organizationId),
        inArray(properties.id, propertyList.map((property) => property.id)),
      ),
    )
    .orderBy(
      asc(propertyImages.sortOrder),
      asc(propertyImages.createdAt),
      asc(propertyImages.id),
    );

  const coverByProperty = new Map<string, string>();
  for (const image of images) {
    if (!coverByProperty.has(image.propertyId)) {
      coverByProperty.set(image.propertyId, getPublicImageUrl(image.storagePath));
    }
  }

  return propertyList.map(
    (property): PublicProperty => ({
      ...property,
      coverUrl: coverByProperty.get(property.id) ?? null,
    }),
  );
}

export async function getPublicCities(organizationId: string) {
  const cityList = await db
    .selectDistinct({ city: properties.city })
    .from(properties)
    .where(
      and(
        ...publicPropertyConditions(organizationId),
      ),
    )
    .orderBy(asc(properties.city));

  return cityList.map(({ city }) => city).filter((city) => city.trim().length > 0);
}

export async function getPublicProperties(
  organizationId: string,
  filters: PublicPropertyFilters,
) {
  const conditions = publicPropertyConditions(organizationId);

  if (filters.operation) conditions.push(eq(properties.operationType, filters.operation));
  if (filters.type) conditions.push(eq(properties.propertyType, filters.type));
  if (filters.city) conditions.push(eq(properties.city, filters.city));
  if (filters.bedrooms !== undefined) conditions.push(gte(properties.bedrooms, filters.bedrooms));
  if (filters.bathrooms !== undefined) conditions.push(gte(properties.bathrooms, filters.bathrooms));
  if (filters.priceMin !== undefined) conditions.push(gte(properties.priceAmount, filters.priceMin * 100));
  if (filters.priceMax !== undefined) conditions.push(lte(properties.priceAmount, filters.priceMax * 100));
  if (filters.price === "over-250000") {
    conditions.push(gte(properties.priceAmount, 25_000_001));
  } else if (filters.price) {
    conditions.push(lte(properties.priceAmount, Number(filters.price) * 100));
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(properties)
    .where(and(...conditions));
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PROPERTIES_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const orderBy =
    filters.sort === "price_asc"
      ? [sql`${properties.priceAmount} asc nulls last`, desc(properties.createdAt), asc(properties.id)]
      : filters.sort === "price_desc"
        ? [sql`${properties.priceAmount} desc nulls last`, desc(properties.createdAt), asc(properties.id)]
        : [desc(properties.createdAt), asc(properties.id)];

  const propertyList = await db
    .select({
      id: properties.id,
      title: properties.title,
      operationType: properties.operationType,
      propertyType: properties.propertyType,
      priceAmount: properties.priceAmount,
      currency: properties.currency,
      city: properties.city,
      bedrooms: properties.bedrooms,
      bathrooms: properties.bathrooms,
      totalAreaM2: properties.totalAreaM2,
    })
    .from(properties)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(PUBLIC_PROPERTIES_PAGE_SIZE)
    .offset((page - 1) * PUBLIC_PROPERTIES_PAGE_SIZE);

  if (propertyList.length === 0) {
    return { properties: [], total, page, totalPages };
  }

  const covers = await db
    .selectDistinctOn([propertyImages.propertyId], {
      propertyId: propertyImages.propertyId,
      storagePath: propertyImages.storagePath,
    })
    .from(propertyImages)
    .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
    .where(
      and(
        ...publicPropertyConditions(organizationId),
        inArray(properties.id, propertyList.map(({ id }) => id)),
      ),
    )
    .orderBy(
      asc(propertyImages.propertyId),
      asc(propertyImages.sortOrder),
      asc(propertyImages.createdAt),
      asc(propertyImages.id),
    );
  const coverByProperty = new Map(
    covers.map(({ propertyId, storagePath }) => [propertyId, getPublicImageUrl(storagePath)]),
  );

  return {
    properties: propertyList.map(
      (property): PublicProperty => ({
        ...property,
        coverUrl: coverByProperty.get(property.id) ?? null,
      }),
    ),
    total,
    page,
    totalPages,
  };
}

export async function getPublicPropertyPaths() {
  return db
    .select({ organizationSlug: organizations.slug, propertyId: properties.id })
    .from(properties)
    .innerJoin(organizations, eq(properties.organizationId, organizations.id))
    .where(
      and(
        eq(properties.isPublished, true),
        ne(properties.status, "draft"),
        ne(properties.status, "archived"),
      ),
    )
    .orderBy(asc(organizations.slug), asc(properties.id));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const getPublicPropertyDetail = cache(async (
  organizationId: string,
  propertyId: string,
) => {
  if (!isUuid(propertyId)) return null;

  const [propertyRows, imageRows] = await Promise.all([
    db
      .select({
        id: properties.id,
        reference: properties.reference,
        title: properties.title,
        description: properties.description,
        operationType: properties.operationType,
        propertyType: properties.propertyType,
        priceAmount: properties.priceAmount,
        currency: properties.currency,
        address: properties.address,
        city: properties.city,
        province: properties.province,
        country: properties.country,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        rooms: properties.rooms,
        garageSpaces: properties.garageSpaces,
        coveredAreaM2: properties.coveredAreaM2,
        totalAreaM2: properties.totalAreaM2,
      })
      .from(properties)
      .where(and(eq(properties.id, propertyId), ...publicPropertyConditions(organizationId)))
      .limit(1),
    db
      .select({
        id: propertyImages.id,
        storagePath: propertyImages.storagePath,
      })
      .from(propertyImages)
      .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
      .where(
        and(
          eq(propertyImages.propertyId, propertyId),
          ...publicPropertyConditions(organizationId),
        ),
      )
      .orderBy(
        asc(propertyImages.sortOrder),
        asc(propertyImages.createdAt),
        asc(propertyImages.id),
      )
      .limit(5),
  ]);

  const [property] = propertyRows;

  if (!property) return null;

  return {
    ...property,
    images: imageRows.map(({ id, storagePath }) => ({
      id,
      url: getPublicImageUrl(storagePath),
    })),
  } satisfies PublicPropertyDetail;
});
