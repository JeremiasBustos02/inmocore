import { asc, eq, count } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { authUsers } from "drizzle-orm/supabase";
import {
  addProviderMember,
  createProviderDemoMember,
  updateProviderOrganization,
} from "@/app/control/actions";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { memberships, organizations, properties } from "@/db/schema";

type OrganizationDetailPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function OrganizationDetailPage({ params, searchParams }: OrganizationDetailPageProps) {
  const { organizationId } = await params;
  const { error, success } = await searchParams;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
    notFound();
  }
  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      isDemo: organizations.isDemo,
      siteVariant: organizations.siteVariant,
      customDomain: organizations.customDomain,
      propertyCount: count(properties.id),
    })
    .from(organizations)
    .leftJoin(properties, eq(properties.organizationId, organizations.id))
    .where(eq(organizations.id, organizationId))
    .groupBy(organizations.id)
    .limit(1);
  if (!organization) notFound();

  const members = await db
    .select({ userId: memberships.userId, email: authUsers.email, role: memberships.role })
    .from(memberships)
    .innerJoin(authUsers, eq(memberships.userId, authUsers.id))
    .where(eq(memberships.organizationId, organization.id))
    .orderBy(asc(authUsers.email));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/control">Volver a inmobiliarias</Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{organization.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={`/${encodeURIComponent(organization.slug)}`} />} size="sm" variant="outline">Ver sitio público</Button>
          <Button render={<Link href={`/admin/${encodeURIComponent(organization.slug)}`} />} size="sm">Abrir panel</Button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{getErrorMessage(error)}</p> : null}
      {success ? <p className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800" role="status">{getSuccessMessage(success)}</p> : null}

      <section className="space-y-4 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">General</h2>
          <p className="mt-1 text-sm text-muted-foreground">Campos internos de la organización y su presentación pública.</p>
        </div>
        <form action={updateProviderOrganization.bind(null, organization.id)} className="grid gap-5 sm:grid-cols-2">
          <Field defaultValue={organization.name} label="Nombre" name="name" required />
          <Field defaultValue={organization.slug} label="Slug" name="slug" required />
          <label className="grid gap-2 text-sm font-medium">
            Variante pública
            <select className="h-9 rounded-lg border bg-background px-3 text-sm" defaultValue={organization.siteVariant} name="siteVariant">
              <option value="default">default</option>
              <option value="editorial">editorial</option>
            </select>
          </label>
          <Field defaultValue={organization.customDomain ?? ""} label="Dominio personalizado" name="customDomain" placeholder="inmobiliaria.com.ar" />
          <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
            <input className="size-4 rounded border" defaultChecked={organization.isDemo} name="isDemo" type="checkbox" />
            Organización demo
          </label>
          <div className="sm:col-span-2"><Button type="submit">Guardar cambios</Button></div>
        </form>
        <dl className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Propiedades</dt><dd className="font-medium">{organization.propertyCount}</dd></div>
          <div><dt className="text-muted-foreground">Estado</dt><dd className="font-medium">{organization.isDemo ? "Demo" : "Activa"}</dd></div>
        </dl>
      </section>

      <section className="space-y-5 rounded-xl border bg-background p-6">
        <div>
          <h2 className="text-lg font-semibold">Usuarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">El email se consulta server-side desde Supabase Auth.</p>
        </div>
        <ul className="divide-y rounded-lg border">
          {members.map((member) => <li className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={member.userId}><span>{member.email ?? "Email no disponible"}</span><span className="capitalize text-muted-foreground">{member.role}</span></li>)}
        </ul>
        <div className="grid gap-6 border-t pt-5 lg:grid-cols-2">
          <form action={addProviderMember.bind(null, organization.id)} className="space-y-4">
            <div>
              <h3 className="font-medium">Invitar usuario</h3>
              <p className="mt-1 text-sm text-muted-foreground">Para clientes reales. Supabase enviará el email de invitación.</p>
            </div>
            <Field label="Email real" name="email" required type="email" />
            <RoleField />
            <Button type="submit" variant="outline">Enviar invitación</Button>
          </form>
          <form action={createProviderDemoMember.bind(null, organization.id)} className="space-y-4 border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <h3 className="font-medium">Crear usuario demo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Acceso inmediato sin email ni SMTP. Usá una contraseña temporal.</p>
            </div>
            <Field label="Email demo" name="email" placeholder="fabricio-demo@demo.local" required type="email" />
            <Field autoComplete="new-password" label="Contraseña temporal" name="password" required type="password" />
            <RoleField />
            <Button type="submit">Crear usuario demo</Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({ autoComplete, defaultValue, label, name, placeholder, required, type = "text" }: { autoComplete?: string; defaultValue?: string; label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<input autoComplete={autoComplete} className="h-9 rounded-lg border bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} /></label>;
}

function RoleField() {
  return <label className="grid gap-2 text-sm font-medium">Rol<select className="h-9 rounded-lg border bg-background px-3 text-sm" defaultValue="agent" name="role"><option value="owner">owner</option><option value="admin">admin</option><option value="agent">agent</option></select></label>;
}

function getErrorMessage(error: string) {
  if (error === "duplicate") return "El slug o el dominio ya pertenece a otra organización.";
  if (error === "member-invalid") return "El email o el rol no son válidos.";
  if (error === "member-duplicate") return "Ese usuario ya pertenece a esta organización.";
  if (error === "demo-invalid") return "El email, la contraseña o el rol demo no son válidos.";
  if (error === "demo-failed") return "No se pudo crear el usuario demo.";
  if (error === "invalid") return "Revisá los datos ingresados.";
  return "No se pudo completar la operación.";
}

function getSuccessMessage(success: string) {
  if (success === "member-added") return "Invitación enviada o usuario existente asociado correctamente.";
  if (success === "demo-added") return "Usuario demo creado y asociado correctamente.";
  if (success === "demo-existing") return "El usuario ya existía; se creó la membership sin modificar su contraseña.";
  return "Cambios guardados.";
}
