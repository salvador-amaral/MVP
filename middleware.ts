import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/clients",
  "/templates",
  "/requests",
  "/settings",
];

// Paths that never need a session check: they either redirect server-side or
// are fully public. Skipping Supabase here avoids a network round-trip on
// every magic-link / auth-callback request.
const NO_SESSION_PREFIXES = ["/p/", "/auth"];

// Signed-in users are bounced away from these to the dashboard.
const AUTH_SCREENS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    NO_SESSION_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Keep the session cookie fresh and protect authenticated routes.
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users are sent to the dashboard instead of auth screens.
  if (user && AUTH_SCREENS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except API routes, static assets and images.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
