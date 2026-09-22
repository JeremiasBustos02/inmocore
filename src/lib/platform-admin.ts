import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";

export function getPlatformAdminUserIds() {
  return (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isPlatformAdminUser(userId: string) {
  return getPlatformAdminUserIds().includes(userId);
}

export async function requirePlatformAdmin() {
  const userId = await requireAuthenticatedUserId();
  if (!isPlatformAdminUser(userId)) notFound();
  return userId;
}
