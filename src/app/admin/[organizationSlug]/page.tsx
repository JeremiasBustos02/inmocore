import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
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
      </section>
    </main>
  );
}
