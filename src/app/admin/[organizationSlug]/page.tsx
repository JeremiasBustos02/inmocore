import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { updateOrganizationWhatsApp } from "./actions";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ whatsapp?: string }>;
};

export default async function OrganizationPage({
  params,
  searchParams,
}: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const [{ organizationSlug }, { whatsapp }] = await Promise.all([params, searchParams]);
  const membership = await requireOrganizationMembership(
    userId,
    organizationSlug,
  );

  if (!membership) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Inmobiliaria
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {membership.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rol: <span className="capitalize">{membership.role}</span>
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className={buttonVariants()}
            href={`/admin/${encodeURIComponent(organizationSlug)}/properties`}
          >
            Propiedades
          </Link>
          <form action={logout}>
            <Button variant="outline" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>

        {membership.role === "owner" || membership.role === "admin" ? (
          <section className="mt-10 border-t pt-8" aria-labelledby="whatsapp-title">
            <h2 className="text-xl font-semibold" id="whatsapp-title">
              Contacto por WhatsApp
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Guardá el número en formato internacional, sólo con dígitos. Ejemplo: 5492266XXXXXX.
            </p>
            <form action={updateOrganizationWhatsApp.bind(null, organizationSlug)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
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
              <p className="mt-3 text-sm text-muted-foreground" role="status">Número actualizado.</p>
            ) : whatsapp === "invalid" ? (
              <p className="mt-3 text-sm text-destructive" role="alert">Ingresá entre 8 y 15 dígitos.</p>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
