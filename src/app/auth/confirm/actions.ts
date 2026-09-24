"use server";

import { setInvitationOnboarding } from "@/lib/invitation-onboarding";
import { requireOrganizationMembership } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(organizationSlug: string) {
  if (!organizationSlug) return false;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;

  const membership = await requireOrganizationMembership(user.id, organizationSlug);
  if (!membership) return false;

  await setInvitationOnboarding(user.id, membership.slug);
  return true;
}
