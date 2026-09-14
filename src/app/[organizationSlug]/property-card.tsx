import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PublicProperty } from "./public-data";

const operationLabels = { sale: "Venta", rent: "Alquiler" } as const;

function formatPrice(priceAmount: number | null, currency: "ARS" | "USD" | null) {
  if (priceAmount === null || currency === null) return "Consultar precio";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceAmount / 100);
}

type PropertyCardProps = {
  organizationSlug: string;
  property: PublicProperty;
};

export function PropertyCard({ organizationSlug, property }: PropertyCardProps) {
  const details = [
    property.bedrooms !== null
      ? `${property.bedrooms} ${property.bedrooms === 1 ? "dormitorio" : "dormitorios"}`
      : null,
    property.bathrooms !== null
      ? `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}`
      : null,
    property.totalAreaM2 !== null ? `${property.totalAreaM2} m² totales` : null,
  ].filter(Boolean);

  return (
    <article className="public-property-card group min-w-0">
      <Link
        aria-label={`Ver ${property.title} en ${property.city}`}
        className="block focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
        href={`/${encodeURIComponent(organizationSlug)}/properties/${property.id}`}
      >
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#dedbd3]">
          {property.coverUrl ? (
            <Image
              alt={`${property.title} en ${property.city}`}
              className="object-cover"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw"
              src={property.coverUrl}
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-end bg-[#dedbd3] p-6"
            >
              <span className="public-display text-5xl text-foreground/25">
                {property.city.charAt(0)}
              </span>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-md bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-card-foreground">
            {operationLabels[property.operationType]}
          </span>
        </div>

        <div className="border-b border-border py-5">
          <div className="mb-2 flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h3 className="public-display break-words text-pretty text-[1.65rem] leading-[1.1] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {property.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{property.city}</p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="mt-1 size-5 shrink-0"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-base font-semibold">
            {formatPrice(property.priceAmount, property.currency)}
          </p>
          {details.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {details.join(" · ")}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
