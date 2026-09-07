import { NextResponse, type NextRequest } from "next/server";
import { isStaffPortalEnabled } from "@/lib/auth/staff-portal-access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const landingUrl = request.nextUrl.clone();
  landingUrl.pathname = "/";
  landingUrl.search = "";

  // The conventional /login route is intentionally never exposed.
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.redirect(landingUrl);
  }

  if (isStaffPortalEnabled()) {
    return NextResponse.next();
  }

  return NextResponse.redirect(landingUrl);
}

export const config = {
  matcher: [
    "/login/:path*",
    "/masuk-petugas/:path*",
    "/dashboard/:path*",
    "/teacher/:path*",
  ],
};
