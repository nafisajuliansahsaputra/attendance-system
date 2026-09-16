import { NextResponse, type NextRequest } from "next/server";
import { isStaffPortalEnabled } from "./src/lib/auth/staff-portal-access";
import { updateSupabaseSession } from "./src/lib/supabase/proxy";

const staffPaths = ["/masuk-petugas", "/dashboard", "/teacher", "/admin"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const landingUrl = request.nextUrl.clone();
  landingUrl.pathname = "/";
  landingUrl.search = "";

  // Conventional /login is never exposed on either public or internal deployments.
  if (matchesPrefix(pathname, "/login")) {
    return NextResponse.redirect(landingUrl);
  }

  // Public portfolio/demo deployments must not expose the operational staff portal.
  if (!isStaffPortalEnabled() && staffPaths.some((prefix) => matchesPrefix(pathname, prefix))) {
    return NextResponse.redirect(landingUrl);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/login/:path*",
    "/masuk-petugas/:path*",
    "/dashboard/:path*",
    "/teacher/:path*",
    "/admin/:path*",
  ],
};
