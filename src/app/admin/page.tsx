import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { getAccessibleOrganizations } from "@/lib/organizations";

export default async function AdminPage() {
  const userId = await requireAuthenticatedUserId();
  const accessibleOrganizations = await getAccessibleOrganizations(userId);

  if (accessibleOrganizations.length === 1) {
    redirect(`/admin/${accessibleOrganizations[0].slug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
      <section className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {accessibleOrganizations.length === 0
              ? "Sin inmobiliarias asignadas"
              : "Elegí una inmobiliaria"}
          </h1>
          <p className="text-muted-foreground">
            {accessibleOrganizations.length === 0
              ? "Tu usuario todavía no pertenece a ninguna inmobiliaria."
              : "Tenés acceso a más de una organización."}
          </p>
        </div>

        {accessibleOrganizations.length > 1 ? (
          <ul className="grid gap-3">
            {accessibleOrganizations.map((organization) => (
              <li key={organization.id}>
                <Link
                  className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  href={`/admin/${organization.slug}`}
                >
                  <span className="font-medium">{organization.name}</span>
                  <span className="ml-2 text-sm capitalize text-muted-foreground">
                    {organization.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <form action={logout}>
          <Button variant="outline" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </section>
    </main>
  );
}
