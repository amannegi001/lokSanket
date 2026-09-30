import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OFFICIAL_COOKIE_NAME, getOfficialSessionToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(OFFICIAL_COOKIE_NAME);
  const expectedToken = getOfficialSessionToken();
  const isAuthenticated = sessionCookie?.value === expectedToken;

  // Protect all /official routes except /official/access
  if (pathname.startsWith("/official") && pathname !== "/official/access") {
    if (!isAuthenticated) {
      const accessUrl = request.nextUrl.clone();
      accessUrl.pathname = "/official/access";
      accessUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(accessUrl);
    }
  }

  // If already authenticated and accessing /official/access, redirect to /official
  if (pathname === "/official/access" && isAuthenticated) {
    const officialUrl = request.nextUrl.clone();
    officialUrl.pathname = "/official";
    officialUrl.searchParams.delete("returnUrl");
    return NextResponse.redirect(officialUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/official/:path*"],
};
