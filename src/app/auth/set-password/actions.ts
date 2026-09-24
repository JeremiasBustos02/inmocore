"use server";

import { redirect } from "next/navigation";
import { clearInvitationOnboarding, getInvitationOrganization } from "@/lib/invitation-onboarding";
import { requireOrganizationMembership } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

export async function createInvitationPassword(_previous: { error: string }, formData: FormData) {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");

  if (typeof password !== "string" || !password || typeof confirmation !== "string" || !confirmation) {
    return { error: "Completá ambos campos." };
  }
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmation) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Tu sesión venció. Pedí una nueva invitación." };

  const organizationSlug = await getInvitationOrganization(user.id);
  if (!organizationSlug) return { error: "No pudimos validar la invitación. Pedí una nueva invitación." };
  const membership = await requireOrganizationMembership(user.id, organizationSlug);
  if (!membership) return { error: "No pudimos validar la invitación. Pedí una nueva invitación." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No pudimos guardar la contraseña. Probá con otra contraseña más segura." };

  await clearInvitationOnboarding();
  redirect(`/admin/${encodeURIComponent(membership.slug)}`);
}
