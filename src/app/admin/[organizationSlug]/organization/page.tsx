import { notFound } from "next/navigation";
import { CheckCircle2, MinusCircle } from "lucide-react";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { LocationPicker } from "@/components/maps/location-picker";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getOrganizationAssetUrl } from "@/lib/organization-assets";
import { requireOrganizationMembership } from "@/lib/organizations";
import { updateOrganizationSettings } from "../actions";
import { geocodeOrganizationAddress } from "../geocoding-actions";
import { OrganizationAssetUpload } from "./organization-asset-upload";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ settings?: string }>;
};

function ConfigurationStatus({ label, complete }: { label: string; complete: boolean }) {
  const Icon = complete ? CheckCircle2 : MinusCircle;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon aria-hidden="true" className={complete ? "size-4 text-emerald-600" : "size-4 text-muted-foreground"} />
      <span>{label}</span>
    </li>
  );
}

export default async function OrganizationPage({ params, searchParams }: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) notFound();

  const { settings } = await searchParams;
  const logoUrl = membership.logoPath ? getOrganizationAssetUrl(membership.logoPath) : null;
  const heroImageUrl = membership.heroImagePath ? getOrganizationAssetUrl(membership.heroImagePath) : null;
  const hasContact = Boolean(membership.contactAddress || membership.contactHours || membership.contactPhone || membership.contactEmail);
  const coordinates = membership.contactLatitude !== null && membership.contactLongitude !== null
    ? { latitude: membership.contactLatitude, longitude: membership.contactLongitude }
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">Configuración del tenant</p>
        <h1 className="text-3xl font-semibold tracking-tight">Organización</h1>
        <p className="max-w-2xl text-muted-foreground">Definí cómo se presenta {membership.name} en su sitio público.</p>
      </header>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="configuration-status-title">
        <h2 className="font-semibold" id="configuration-status-title">Configuración</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <ConfigurationStatus complete={hasContact} label="Datos de contacto" />
          <ConfigurationStatus complete={Boolean(membership.whatsappPhone)} label="WhatsApp" />
          <ConfigurationStatus complete={Boolean(membership.primaryColor)} label="Branding" />
          <ConfigurationStatus complete={Boolean(membership.logoPath)} label="Logo" />
          <ConfigurationStatus complete={Boolean(membership.heroImagePath)} label="Imagen de portada" />
        </ul>
      </section>

      <form action={updateOrganizationSettings.bind(null, organizationSlug)} className="flex flex-col gap-6">
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6" aria-labelledby="contact-title">
          <div><h2 className="text-xl font-semibold" id="contact-title">Contacto</h2><p className="mt-1 text-sm text-muted-foreground">Estos datos pueden aparecer en el pie del sitio público.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
             <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="whatsappPhone">WhatsApp<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.whatsappPhone ?? ""} id="whatsappPhone" inputMode="tel" maxLength={20} name="whatsappPhone" placeholder="5492266XXXXXX" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="contactPhone">Teléfono<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.contactPhone ?? ""} id="contactPhone" inputMode="tel" maxLength={30} name="contactPhone" placeholder="02266 123456" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2" htmlFor="contactAddress">Dirección pública<input className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.contactAddress ?? ""} id="contactAddress" maxLength={180} name="contactAddress" placeholder="Dirección de la inmobiliaria" /></label>
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2" htmlFor="contactHours">Horario de atención<textarea className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={membership.contactHours ?? ""} id="contactHours" maxLength={1000} name="contactHours" placeholder="Escribí los horarios de atención" rows={4} /></label>
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2" htmlFor="contactEmail">Email público<input aria-invalid={settings === "invalid-email"} className="h-10 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive" defaultValue={membership.contactEmail ?? ""} id="contactEmail" maxLength={254} name="contactEmail" placeholder="hola@inmobiliaria.com" type="email" />{settings === "invalid-email" ? <span className="text-sm font-normal text-destructive" role="alert">Ingresá un email válido.</span> : null}</label>
           </div>
           <div className="flex flex-col gap-3 border-t pt-5">
             <div>
               <h3 className="font-medium">Ubicación de la inmobiliaria</h3>
               <p className="mt-1 text-sm text-muted-foreground">Se mostrará en la sección Hablemos del sitio público.</p>
             </div>
             <LocationPicker
               addressFieldNames={["contactAddress"]}
               geocodeAction={geocodeOrganizationAddress.bind(null, organizationSlug)}
               initialCoordinates={coordinates}
               markerColor={membership.primaryColor}
             />
             {settings === "invalid-location" ? <p className="text-sm text-destructive" role="alert">La ubicación seleccionada no es válida.</p> : null}
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

        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center"><AdminSubmitButton pendingLabel="Guardando…">Guardar configuración</AdminSubmitButton>{settings === "saved" ? <p className="text-sm text-muted-foreground" role="status">Configuración actualizada.</p> : settings?.startsWith("invalid") ? <p className="text-sm text-destructive" role="alert">Revisá los datos ingresados.</p> : null}</div>
      </form>
    </main>
  );
}
