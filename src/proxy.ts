import { NextResponse, type NextRequest } from "next/server";
import {
  CUSTOM_DOMAIN_HEADER,
  CUSTOM_DOMAIN_ROUTE_PREFIX,
  getPublicSiteUrl,
  normalizeCustomDomain,
} from "@/lib/public-site";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/admin")) {
    return updateSession(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CUSTOM_DOMAIN_HEADER);
  const hostname = normalizeCustomDomain(request.nextUrl.hostname);
  const platformHostname = getPublicSiteUrl()?.hostname;
  const isPlatformHost =
    !hostname ||
    hostname === platformHostname ||
    hostname.endsWith(".vercel.app");

  if (isPlatformHost) {
    return NextResponse.next({ request: { headers: requestHeaders } });
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
