import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "../public-footer";
import { PublicHeader } from "../public-header";
import { getPublicOrganization } from "../public-data";

type PublicPropertiesPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export default async function PublicPropertiesPage({
  params,
}: PublicPropertiesPageProps) {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const homeHref = `/${encodeURIComponent(organization.slug)}`;

  return (
    <div className="public-site flex min-h-screen flex-col">
      <PublicHeader organizationName={organization.name} organizationSlug={organization.slug} />
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-5 py-20 sm:px-8 lg:px-10" id="contenido-principal">
        <p className="text-sm font-medium text-brand-accent">Catálogo</p>
        <h1 className="public-display mt-5 max-w-3xl text-balance text-[clamp(3rem,7vw,6rem)] leading-[0.94] tracking-[-0.03em]">
          Estamos preparando el catálogo completo.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
          La búsqueda avanzada y el listado de propiedades estarán disponibles en la próxima etapa.
        </p>
        <Link className="public-link mt-8 w-fit text-sm font-semibold" href={`${homeHref}#propiedades`}>
          Volver a propiedades destacadas
        </Link>
      </main>
      <PublicFooter organizationName={organization.name} organizationSlug={organization.slug} />
    </div>
  );
}
