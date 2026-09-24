import { redirect } from "next/navigation";
import { getInvitationOrganization } from "@/lib/invitation-onboarding";
import { requireOrganizationMembership } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const organizationSlug = await getInvitationOrganization(user.id);
  if (!organizationSlug || !await requireOrganizationMembership(user.id, organizationSlug)) {
    redirect("/auth/invitation-invalid");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido a tu panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Creá una contraseña para administrar las propiedades de tu inmobiliaria.
        </p>
        <PasswordForm />
      </div>
    </main>
  );
}
