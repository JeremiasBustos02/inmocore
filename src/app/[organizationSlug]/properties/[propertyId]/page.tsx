import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "../../public-footer";
import { PublicHeader } from "../../public-header";
import { getPublicOrganization, getPublicPropertySummary } from "../../public-data";

type PublicPropertyPageProps = {
  params: Promise<{ organizationSlug: string; propertyId: string }>;
};

export default async function PublicPropertyPage({ params }: PublicPropertyPageProps) {
  const { organizationSlug, propertyId } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const property = await getPublicPropertySummary(organization.id, propertyId);
  if (!property) notFound();

  const homeHref = `/${encodeURIComponent(organization.slug)}`;

  return (
    <div className="public-site flex min-h-screen flex-col">
      <PublicHeader organizationName={organization.name} organizationSlug={organization.slug} />
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-5 py-20 sm:px-8 lg:px-10" id="contenido-principal">
        <p className="text-sm font-medium text-brand-accent">{property.city}</p>
        <h1 className="mt-5 max-w-4xl break-words text-balance text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          {property.title}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
          La ficha completa de esta propiedad estará disponible en la próxima etapa.
        </p>
        <Link className="public-link mt-8 w-fit text-sm font-semibold" href={`${homeHref}#propiedades`}>
          Volver a propiedades destacadas
        </Link>
      </main>
      <PublicFooter organizationName={organization.name} organizationSlug={organization.slug} />
    </div>
  );
}
