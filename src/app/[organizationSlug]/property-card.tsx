import { ArrowUpRight, Bath, BedDouble, House, MapPin, Maximize2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PublicProperty } from "./public-data";
import {
  formatPublicPrice,
  publicOperationLabels,
  publicPropertyTypeLabels,
} from "./public-property-options";

type PropertyCardProps = {
  publicBasePath: string;
  property: PublicProperty;
};

export function PropertyCard({ publicBasePath, property }: PropertyCardProps) {
  return (
    <article className="public-property-card group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-[box-shadow,transform] duration-250 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        aria-label={`Ver ${property.title} en ${property.city}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        href={`${publicBasePath}/properties/${property.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-muted">
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
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
              {publicOperationLabels[property.operationType]}
            </span>
            {property.isFeatured ? (
              <span className="rounded-md bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                Destacada
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight tracking-[-0.025em] tabular-nums">
                {formatPublicPrice(property.priceAmount, property.currency)}
              </p>
              <h3 className="public-property-title mt-2 line-clamp-2 text-pretty text-base font-semibold leading-snug tracking-[-0.015em]">
                {property.title}
              </h3>
            </div>
            <span className="public-card-arrow mt-0.5 shrink-0 text-muted-foreground">
              <ArrowUpRight aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{property.city}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span>{publicPropertyTypeLabels[property.propertyType]}</span>
            {property.bedrooms !== null ? <span className="inline-flex items-center gap-1"><BedDouble aria-hidden="true" className="size-3.5" />{property.bedrooms}</span> : null}
            {property.bathrooms !== null ? <span className="inline-flex items-center gap-1"><Bath aria-hidden="true" className="size-3.5" />{property.bathrooms}</span> : null}
            {property.totalAreaM2 !== null ? <span className="inline-flex items-center gap-1"><Maximize2 aria-hidden="true" className="size-3" />{property.totalAreaM2} m²</span> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
