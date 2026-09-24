import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import {
  CUSTOM_DOMAIN_HEADER,
  CUSTOM_DOMAIN_ROUTE_PREFIX,
  getPublicSiteUrl,
  normalizeCustomDomain,
} from "@/lib/public-site";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/auth/")) {
    return updateSession(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CUSTOM_DOMAIN_HEADER);
  const requestHostname = getRequestHostname(request);
  const hostname = normalizeCustomDomain(requestHostname);
  const platformHostname = getPublicSiteUrl()?.hostname;
  const isLocalhost =
    requestHostname === "localhost" ||
    requestHostname === "127.0.0.1" ||
    requestHostname === "::1";
  const isPlatformHost =
    isLocalhost ||
    hostname === platformHostname ||
    hostname?.endsWith(".vercel.app");

  if (isPlatformHost) {
    if (!isLocalhost && hostname && hostname === platformHostname) {
      const redirect = await redirectPlatformTenantToCustomDomain(request, hostname);
      if (redirect) return redirect;
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!hostname) {
    return new NextResponse("Not Found", { status: 404 });
  }

  requestHeaders.set(CUSTOM_DOMAIN_HEADER, hostname);

  if (request.nextUrl.pathname === "/sitemap.xml" || request.nextUrl.pathname === "/robots.txt") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${CUSTOM_DOMAIN_ROUTE_PREFIX}${hostname}${
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  }`;
  return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

function getRequestHostname(request: NextRequest) {
  const hostHeader = request.headers.get("host")?.trim();
  if (!hostHeader) return request.nextUrl.hostname.toLowerCase().replace(/\.$/, "");

  return (hostHeader.startsWith("[")
    ? hostHeader.slice(1, hostHeader.indexOf("]"))
    : hostHeader.replace(/:\d+$/, ""))
    .toLowerCase()
    .replace(/\.$/, "");
}

async function redirectPlatformTenantToCustomDomain(
  request: NextRequest,
  platformHostname: string,
) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  if (
    segments.length < 1 ||
    segments.length > 3 ||
    (segments.length > 1 && !["properties", "propiedades"].includes(segments[1])) ||
    (segments.length === 3 && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segments[2]))
  ) {
    return null;
  }

  let slug: string;
  try {
    slug = decodeURIComponent(segments[0]);
  } catch {
    return null;
  }
  if (["admin", "control", "auth", "dev", "login", "api", "_next", "_not-found", "robots.txt", "sitemap.xml", "favicon.ico"].includes(slug.toLowerCase())) {
    return null;
  }

  const [organization] = await db
    .select({ customDomain: organizations.customDomain })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  const customDomain = normalizeCustomDomain(organization?.customDomain);
  if (!customDomain || customDomain === platformHostname) return null;

  const publicPathSegments = segments.slice(1);
  if (publicPathSegments[0] === "properties") publicPathSegments[0] = "propiedades";
  const publicPath = publicPathSegments.length > 0
    ? `/${publicPathSegments.join("/")}`
    : "/";
  const destination = new URL(`${publicPath}${request.nextUrl.search}`, `https://${customDomain}`);
  return NextResponse.redirect(destination, 308);
}
