import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isPlatformAdminUser } from "@/lib/platform-admin";
import { getAccessibleOrganizations } from "@/lib/organizations";

export default async function Home() {
  const userId = await getAuthenticatedUserId();
  if (userId) {
    if (isPlatformAdminUser(userId)) redirect("/control");
    const organizations = await getAccessibleOrganizations(userId);
    if (organizations.length === 1) redirect(`/admin/${organizations[0].slug}`);
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">InmoCore</h1>
        <p className="text-lg text-muted-foreground">Plataforma inmobiliaria</p>
        <Link className="mx-auto mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/login">
          Acceder
        </Link>
      </div>
    </main>
  );
}
