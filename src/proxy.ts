import { NextResponse, type NextRequest } from "next/server";
import {
  CUSTOM_DOMAIN_HEADER,
  CUSTOM_DOMAIN_ROUTE_PREFIX,
  getPublicSiteUrl,
  normalizeCustomDomain,
} from "@/lib/public-site";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/admin")) {
    return updateSession(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CUSTOM_DOMAIN_HEADER);
  const requestHostname = getRequestHostname(request);
  const hostname = normalizeCustomDomain(requestHostname);
  const platformHostname = getPublicSiteUrl()?.hostname;
  const isPlatformHost =
    requestHostname === "localhost" ||
    requestHostname === "127.0.0.1" ||
    requestHostname === "::1" ||
    hostname === platformHostname ||
    hostname?.endsWith(".vercel.app");

  if (isPlatformHost) {
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
