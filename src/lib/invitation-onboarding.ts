import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "inmocore-invitation";
const MAX_AGE = 60 * 60 * 24;

function signature(value: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is required for invitation onboarding.");
  return createHmac("sha256", secret).update(`invitation-onboarding:${value}`).digest("base64url");
}

export async function setInvitationOnboarding(userId: string, organizationSlug: string) {
  const payload = Buffer.from(JSON.stringify({ userId, organizationSlug, expires: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getInvitationOrganization(userId: string) {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;
  const [payload, signed, extra] = value.split(".");
  if (!payload || !signed || extra) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(signed);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null ||
      !("userId" in parsed) || parsed.userId !== userId ||
      !("organizationSlug" in parsed) || typeof parsed.organizationSlug !== "string" ||
      !("expires" in parsed) || typeof parsed.expires !== "number" || parsed.expires < Date.now()) return null;
    return parsed.organizationSlug;
  } catch {
    return null;
  }
}

export async function clearInvitationOnboarding() {
  (await cookies()).delete(COOKIE_NAME);
}
