import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { updateOrganizationWhatsApp } from "../actions";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ whatsapp?: string }>;
};

export default async function OrganizationPage({
  params,
  searchParams,
}: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "admin")
  ) {
    notFound();
  }

  const { whatsapp } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Organización</h1>
        <p className="text-muted-foreground">Configurá los datos de tu inmobiliaria.</p>
      </header>

      <section className="flex flex-col gap-5 rounded-xl border bg-card p-6" aria-labelledby="whatsapp-title">
        <div>
          <h2 className="text-xl font-semibold" id="whatsapp-title">Contacto</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Guardá el número de WhatsApp en formato internacional, sólo con dígitos. Ejemplo: 5492266XXXXXX.
          </p>
        </div>
        <form action={updateOrganizationWhatsApp.bind(null, organizationSlug)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-sm">
            <label className="text-sm font-medium" htmlFor="whatsappPhone">
              Número de WhatsApp
            </label>
            <input
              autoComplete="tel"
              className="mt-2 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue={membership.whatsappPhone ?? ""}
              id="whatsappPhone"
              inputMode="tel"
              maxLength={20}
              name="whatsappPhone"
              placeholder="5492266XXXXXX"
              type="tel"
            />
          </div>
          <Button type="submit">Guardar número</Button>
        </form>
        {whatsapp === "saved" ? (
          <p className="text-sm text-muted-foreground" role="status">Número actualizado.</p>
        ) : whatsapp === "invalid" ? (
          <p className="text-sm text-destructive" role="alert">Ingresá entre 8 y 15 dígitos.</p>
        ) : null}
      </section>
    </main>
  );
}
