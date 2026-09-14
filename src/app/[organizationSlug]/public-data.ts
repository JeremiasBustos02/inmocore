import { cache } from "react";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { organizations, properties, propertyImages } from "@/db/schema";
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

export const getPublicOrganization = cache(async (organizationSlug: string) => {
  const [organization] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug))
    .limit(1);

  return organization ?? null;
});

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
        eq(properties.organizationId, organizationId),
        eq(properties.isPublished, true),
        ne(properties.status, "archived"),
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
        eq(properties.organizationId, organizationId),
        eq(properties.isPublished, true),
        ne(properties.status, "archived"),
        inArray(properties.id, propertyList.map((property) => property.id)),
      ),
    )
    .orderBy(asc(propertyImages.sortOrder), asc(propertyImages.createdAt));

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
        eq(properties.organizationId, organizationId),
        eq(properties.isPublished, true),
        ne(properties.status, "archived"),
      ),
    )
    .orderBy(asc(properties.city));

  return cityList.map(({ city }) => city).filter((city) => city.trim().length > 0);
}

export async function getPublicPropertySummary(
  organizationId: string,
  propertyId: string,
) {
  const [property] = await db
    .select({ id: properties.id, title: properties.title, city: properties.city })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, organizationId),
        eq(properties.isPublished, true),
        ne(properties.status, "archived"),
      ),
    )
    .limit(1);

  return property ?? null;
}
