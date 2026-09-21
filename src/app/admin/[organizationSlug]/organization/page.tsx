import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getOrganizationAssetUrl } from "@/lib/organization-assets";
import { requireOrganizationMembership } from "@/lib/organizations";
import { updateOrganizationSettings } from "../actions";
import { OrganizationAssetUpload } from "./organization-asset-upload";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ settings?: string }>;
};

export default async function OrganizationPage({ params, searchParams }: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) notFound();

  const { settings } = await searchParams;
  const logoUrl = membership.logoPath ? getOrganizationAssetUrl(membership.logoPath) : null;
  const heroImageUrl = membership.heroImagePath ? getOrganizationAssetUrl(membership.heroImagePath) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Configuración del tenant</p>
        <h1 className="text-3xl font-semibold tracking-tight">Organización</h1>
        <p className="max-w-2xl text-muted-foreground">Definí cómo se presenta {membership.name} en su sitio público.</p>
      </header>

      <form action={updateOrganizationSettings.bind(null, organizationSlug)} className="flex flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6" aria-labelledby="contact-title">
          <div><h2 className="text-xl font-semibold" id="contact-title">Contacto</h2><p className="mt-1 text-sm text-muted-foreground">Estos datos pueden aparecer en el pie del sitio público.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">WhatsApp<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.whatsappPhone ?? ""} inputMode="tel" maxLength={20} name="whatsappPhone" placeholder="5492266XXXXXX" /></label>
            <label className="flex flex-col gap-2 text-sm font-medium">Teléfono<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.contactPhone ?? ""} inputMode="tel" maxLength={30} name="contactPhone" placeholder="02266 123456" /></label>
            <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">Email público<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.contactEmail ?? ""} maxLength={254} name="contactEmail" placeholder="hola@inmobiliaria.com" type="email" /></label>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6" aria-labelledby="appearance-title">
          <div><h2 className="text-xl font-semibold" id="appearance-title">Apariencia</h2><p className="mt-1 text-sm text-muted-foreground">Un color principal para botones y acentos del sitio público.</p></div>
          <label className="flex max-w-sm flex-col gap-2 text-sm font-medium">Color principal<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-mono font-normal uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.primaryColor ?? ""} maxLength={7} name="primaryColor" pattern="#[0-9A-Fa-f]{6}" placeholder="#1B1B1B" /></label>
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><span className="size-8 rounded-full border" style={{ backgroundColor: membership.primaryColor ?? "#1b1b1b" }} />Vista previa del color</div>
          <div><h3 className="font-medium">Logo</h3><p className="mb-3 mt-1 text-sm text-muted-foreground">Se muestra en el header y conserva sus proporciones.</p><OrganizationAssetUpload assetType="logo" currentUrl={logoUrl} label="Logo" organizationId={membership.id} organizationSlug={organizationSlug} /></div>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6" aria-labelledby="hero-settings-title">
          <div><h2 className="text-xl font-semibold" id="hero-settings-title">Portada</h2><p className="mt-1 text-sm text-muted-foreground">Texto plano e imagen para la portada del sitio. Cada campo es opcional.</p></div>
          <div className="grid gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">Título<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.heroTitle ?? ""} maxLength={120} name="heroTitle" placeholder="Encontrá tu próximo lugar" /></label>
            <label className="flex flex-col gap-2 text-sm font-medium">Subtítulo<textarea className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.heroSubtitle ?? ""} maxLength={240} name="heroSubtitle" placeholder="Propiedades para vivir, invertir y proyectar con confianza." /></label>
          </div>
          <div><h3 className="font-medium">Imagen de portada</h3><p className="mb-3 mt-1 text-sm text-muted-foreground">Se usa como fondo del Hero y se reemplaza sin versionado.</p><OrganizationAssetUpload assetType="hero" currentUrl={heroImageUrl} label="Imagen de portada" organizationId={membership.id} organizationSlug={organizationSlug} /></div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Button type="submit">Guardar configuración</Button>{settings === "saved" ? <p className="text-sm text-muted-foreground" role="status">Configuración actualizada.</p> : settings?.startsWith("invalid") ? <p className="text-sm text-destructive" role="alert">Revisá los datos ingresados.</p> : null}</div>
      </form>
    </main>
  );
}
