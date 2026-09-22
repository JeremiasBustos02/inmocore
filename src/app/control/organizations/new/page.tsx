import Link from "next/link";
import { createProviderOrganization } from "@/app/control/actions";
import { Button } from "@/components/ui/button";

type NewOrganizationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewOrganizationPage({ searchParams }: NewOrganizationPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/control">
          Volver a inmobiliarias
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Nueva inmobiliaria</h1>
        <p className="mt-2 text-sm text-muted-foreground">Creá una organización sin configurar todavía su contenido público.</p>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{getErrorMessage(error)}</p> : null}

      <form action={createProviderOrganization} className="space-y-6 rounded-xl border bg-background p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" name="name" required />
          <Field label="Slug" name="slug" required />
          <label className="grid gap-2 text-sm font-medium">
            Variante pública
            <select className="h-9 rounded-lg border bg-background px-3 text-sm" defaultValue="default" name="siteVariant">
              <option value="default">default</option>
              <option value="editorial">editorial</option>
            </select>
          </label>
          <Field label="Dominio personalizado" name="customDomain" placeholder="inmobiliaria.com.ar" />
          <Field label="Email del owner (opcional)" name="ownerEmail" type="email" />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input className="size-4 rounded border" name="isDemo" type="checkbox" />
          Crear como organización demo
        </label>
        <div className="flex flex-wrap gap-3 border-t pt-5">
          <Button type="submit">Crear inmobiliaria</Button>
          <Button render={<Link href="/control" />} type="button" variant="outline">Cancelar</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, placeholder, required, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input className="h-9 rounded-lg border bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function getErrorMessage(error: string) {
  if (error === "duplicate") return "El slug o el dominio ya pertenece a otra organización.";
  if (error === "invalid-email") return "El email del owner no es válido.";
  if (error === "invalid") return "Revisá los datos ingresados.";
  return "No se pudo crear la organización.";
}
