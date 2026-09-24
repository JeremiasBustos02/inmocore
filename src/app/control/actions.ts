"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { derivePropertyCodePrefix } from "@/lib/property-code-format";
import { memberships, organizations } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getPublicSiteUrl } from "@/lib/public-site";
import {
  createDemoAuthUser,
  deleteAuthUser,
  findAuthUserByEmail,
  inviteAuthUser,
} from "@/lib/platform-auth";
import {
  normalizeCustomDomain,
  normalizeSiteVariant,
  normalizeSlug,
} from "@/lib/organization-validation.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["owner", "admin", "agent"] as const;

function readText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readEmail(formData: FormData) {
  const email = readText(formData, "email", 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("El email no es válido.");
  return email;
}

function readRole(formData: FormData) {
  const role = readText(formData, "role", 20);
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error("El rol debe ser owner, admin o agent.");
  }
  return role as (typeof ROLES)[number];
}

function readPassword(formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("La contraseña temporal debe tener entre 8 y 128 caracteres.");
  }
  return password;
}

function organizationPath(organizationId: string) {
  return `/control/organizations/${encodeURIComponent(organizationId)}`;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function isEmailRateLimit(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "over_email_send_rate_limit";
}

function logInvitationFailure(stage: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;

  console.error("[control-invite]", {
    stage,
    message: error instanceof Error ? error.message : "Error desconocido",
    code: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code : undefined,
    status: typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status : undefined,
  });
}

export async function createProviderOrganization(formData: FormData) {
  await requirePlatformAdmin();

  const name = readText(formData, "name", 160);
  if (!name) redirect("/control/organizations/new?error=invalid");

  let slug: string;
  let siteVariant: string;
  let customDomain: string | null;
  try {
    slug = normalizeSlug(readText(formData, "slug", 80));
    siteVariant = normalizeSiteVariant(readText(formData, "siteVariant", 20));
    customDomain = normalizeCustomDomain(readText(formData, "customDomain", 253), getPlatformHostname());
  } catch {
    redirect("/control/organizations/new?error=invalid");
  }

  const isDemo = formData.get("isDemo") === "on";
  const ownerEmailValue = readText(formData, "ownerEmail", 254).toLowerCase();
  if (ownerEmailValue && !EMAIL_PATTERN.test(ownerEmailValue)) {
    redirect("/control/organizations/new?error=invalid-email");
  }

  let createdUserId: string | undefined;
  let organizationId = "";
  let stage = "findAuthUserByEmail";
  try {
    let ownerId: string | undefined;
    if (ownerEmailValue) {
      const existingUser = await findAuthUserByEmail(ownerEmailValue);
      if (existingUser) {
        ownerId = existingUser.id;
      } else {
        stage = "inviteRedirectUrl";
        const redirectTo = await inviteRedirectUrl(slug);
        stage = "inviteUserByEmail";
        const invitedUser = await inviteAuthUser(ownerEmailValue, redirectTo);
        ownerId = invitedUser.id;
        createdUserId = invitedUser.id;
      }
    }

    stage = "createOrganization";
    const [createdOrganization] = await db.transaction(async (transaction) => {
      const [createdOrganization] = await transaction
        .insert(organizations)
        .values({
          name,
          slug,
          propertyCodePrefix: derivePropertyCodePrefix(slug),
          siteVariant,
          customDomain,
          isDemo,
        })
        .returning({ id: organizations.id });

      if (ownerId) {
        stage = "membershipInsert";
        await transaction.insert(memberships).values({
          organizationId: createdOrganization.id,
          userId: ownerId,
          role: "owner",
        });
      }

      return [createdOrganization];
    });
    organizationId = createdOrganization.id;
  } catch (error) {
    logInvitationFailure(stage, error);
    if (createdUserId) {
      const { error: deleteError } = await deleteAuthUser(createdUserId);
      if (deleteError) {
        console.error(`No se pudo compensar el usuario invitado: ${deleteError.message}`);
      }
    }
    if (stage === "inviteUserByEmail" && isEmailRateLimit(error)) {
      redirect("/control/organizations/new?error=email-rate-limit");
    }
    if (isUniqueViolation(error)) {
      redirect("/control/organizations/new?error=duplicate");
    }
    redirect("/control/organizations/new?error=failed");
  }

  revalidatePath("/control");
  redirect(organizationPath(organizationId));
}

export async function updateProviderOrganization(
  organizationId: string,
  formData: FormData,
) {
  await requirePlatformAdmin();
  if (!UUID_PATTERN.test(organizationId)) notFound();

  const [current] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!current) notFound();

  const name = readText(formData, "name", 160);
  if (!name) redirect(`${organizationPath(organizationId)}?error=invalid`);

  let slug: string;
  let siteVariant: string;
  let customDomain: string | null;
  try {
    slug = normalizeSlug(readText(formData, "slug", 80));
    siteVariant = normalizeSiteVariant(readText(formData, "siteVariant", 20));
    customDomain = normalizeCustomDomain(readText(formData, "customDomain", 253), getPlatformHostname());
  } catch {
    redirect(`${organizationPath(organizationId)}?error=invalid`);
  }

  try {
    await db
      .update(organizations)
      .set({ name, slug, siteVariant, customDomain, isDemo: formData.get("isDemo") === "on", updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
  } catch (error) {
    if (isUniqueViolation(error)) redirect(`${organizationPath(organizationId)}?error=duplicate`);
    redirect(`${organizationPath(organizationId)}?error=failed`);
  }

  revalidatePath("/control");
  revalidatePath(organizationPath(organizationId));
  revalidatePath(`/${encodeURIComponent(current.slug)}`);
  revalidatePath(`/${encodeURIComponent(slug)}`);
  redirect(`${organizationPath(organizationId)}?success=saved`);
}

export async function addProviderMember(
  organizationId: string,
  formData: FormData,
) {
  await requirePlatformAdmin();
  if (!UUID_PATTERN.test(organizationId)) notFound();

  const [organization] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) notFound();

  let email: string;
  let role: (typeof ROLES)[number];
  try {
    email = readEmail(formData);
    role = readRole(formData);
  } catch (error) {
    logInvitationFailure("validation", error);
    redirect(`${organizationPath(organizationId)}?error=member-invalid`);
  }

  let createdUserId: string | undefined;
  let stage = "findAuthUserByEmail";
  try {
    const existingUser = await findAuthUserByEmail(email);
    let userId = existingUser?.id;
    if (!userId) {
      stage = "inviteRedirectUrl";
      const redirectTo = await inviteRedirectUrl(organization.slug);
      stage = "inviteUserByEmail";
      const invitedUser = await inviteAuthUser(email, redirectTo);
      userId = invitedUser.id;
      createdUserId = invitedUser.id;
    }

    stage = "membershipInsert";
    const inserted = await db
      .insert(memberships)
      .values({ organizationId: organization.id, userId, role })
      .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] })
      .returning({ userId: memberships.userId });
    if (inserted.length === 0) {
      throw new Error("El usuario ya tiene membership en esta organización.");
    }
  } catch (error) {
    logInvitationFailure(stage, error);
    if (createdUserId) {
      const { error: deleteError } = await deleteAuthUser(createdUserId);
      if (deleteError) {
        console.error(`No se pudo compensar el usuario invitado: ${deleteError.message}`);
      }
    }
    if (stage === "inviteUserByEmail" && isEmailRateLimit(error)) {
      redirect(`${organizationPath(organizationId)}?error=member-email-rate-limit`);
    }
    if (error instanceof Error && error.message.includes("ya tiene membership")) {
      redirect(`${organizationPath(organizationId)}?error=member-duplicate`);
    }
    redirect(`${organizationPath(organizationId)}?error=member-failed`);
  }

  revalidatePath(organizationPath(organizationId));
  redirect(`${organizationPath(organizationId)}?success=member-added`);
}

export async function createProviderDemoMember(
  organizationId: string,
  formData: FormData,
) {
  await requirePlatformAdmin();
  if (!UUID_PATTERN.test(organizationId)) notFound();

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) notFound();

  let email: string;
  let role: (typeof ROLES)[number];
  let password: string;
  try {
    email = readEmail(formData);
    role = readRole(formData);
    password = readPassword(formData);
  } catch {
    redirect(`${organizationPath(organizationId)}?error=demo-invalid`);
  }

  let createdUserId: string | undefined;
  let existingUser = false;
  try {
    const authUser = await findAuthUserByEmail(email);
    let userId = authUser?.id;
    if (userId) {
      existingUser = true;
    } else {
      const demoUser = await createDemoAuthUser(email, password);
      userId = demoUser.id;
      createdUserId = demoUser.id;
    }

    const inserted = await db
      .insert(memberships)
      .values({ organizationId: organization.id, userId, role })
      .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] })
      .returning({ userId: memberships.userId });
    if (inserted.length === 0) {
      throw new Error("El usuario ya tiene membership en esta organización.");
    }
  } catch (error) {
    if (createdUserId) {
      const { error: deleteError } = await deleteAuthUser(createdUserId);
      if (deleteError) {
        console.error(`No se pudo compensar el usuario demo: ${deleteError.message}`);
      }
    }
    if (error instanceof Error && error.message.includes("ya tiene membership")) {
      redirect(`${organizationPath(organizationId)}?error=member-duplicate`);
    }
    redirect(`${organizationPath(organizationId)}?error=demo-failed`);
  }

  revalidatePath(organizationPath(organizationId));
  redirect(`${organizationPath(organizationId)}?success=${existingUser ? "demo-existing" : "demo-added"}`);
}

function getPlatformHostname() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function inviteRedirectUrl(organizationSlug: string) {
  const requestOrigin = (await headers()).get("origin");
  const localOrigin = requestOrigin ? new URL(requestOrigin) : null;
  const siteUrl = process.env.NODE_ENV === "development" &&
    localOrigin?.protocol === "http:" &&
    (localOrigin.hostname === "localhost" || localOrigin.hostname === "127.0.0.1")
    ? localOrigin
    : getPublicSiteUrl();

  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL es requerido para enviar invitaciones.");
  const url = new URL("/auth/confirm", siteUrl);
  url.searchParams.set("organization", organizationSlug);
  return url.toString();
}
