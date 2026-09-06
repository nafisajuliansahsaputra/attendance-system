import { NextResponse, type NextRequest } from "next/server";
import { isStaffPortalEnabled } from "@/lib/auth/staff-portal-access";

export function proxy(request: NextRequest) {
  if (isStaffPortalEnabled()) {
    return NextResponse.next();
  }

  const landingUrl = request.nextUrl.clone();
  landingUrl.pathname = "/";
  landingUrl.search = "";

  return NextResponse.redirect(landingUrl);
}

export const config = {
  matcher: ["/login/:path*", "/dashboard/:path*", "/teacher/:path*"],
};
