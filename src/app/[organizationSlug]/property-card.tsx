import { ArrowUpRight, House } from "lucide-react";
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
      ? `${property.bedrooms} dorm.`
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
        className="block focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        href={`/${encodeURIComponent(organizationSlug)}/properties/${property.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
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
              className="absolute inset-0 flex items-center justify-center bg-muted"
            >
              <House className="size-9 text-foreground/20" strokeWidth={1.4} />
            </div>
          )}
        </div>

        <div className="pt-4">
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {operationLabels[property.operationType]}
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="public-property-title break-words text-pretty text-xl font-semibold leading-snug tracking-[-0.02em]">
                {property.title}
              </h3>
            </div>
            <span className="public-card-arrow mt-1 shrink-0">
              <ArrowUpRight
                aria-hidden="true"
                className="size-[18px]"
                strokeWidth={1.6}
              />
            </span>
          </div>
          <p className="mt-3 text-base font-semibold tabular-nums">
            {formatPrice(property.priceAmount, property.currency)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{property.city}</p>
          {details.length > 0 ? (
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {details.join(" · ")}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
