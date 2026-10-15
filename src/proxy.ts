import { NextResponse, type NextRequest } from "next/server";

// Quick check before rendering: send visitors without a session cookie
// straight to the login page. Real authorisation happens on the server in
// every page, action and route handler (see src/lib/auth.ts).
export function proxy(request: NextRequest) {
  if (request.cookies.has("bbb_session")) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
