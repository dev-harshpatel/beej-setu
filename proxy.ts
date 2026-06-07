import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_ROUTES } from "@/constants/routes.constants";
import { ROUTES } from "@/constants/routes.constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — keeps the Supabase session alive.
  // This must run on every request (including API routes) so that
  // an expiring access token is refreshed via the refresh token
  // before it reaches the route handler.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // API routes handle their own auth via withAuth — never redirect them.
  const isApiRoute = pathname.startsWith("/api/");

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  // Redirect unauthenticated users to login (page routes only)
  if (!user && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
  }

  // Redirect authenticated users away from auth pages (page routes only)
  if (user && isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD.ROOT, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    // API routes are intentionally included so the session refresh above
    // runs before every fetch, preventing expired-token 401s.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
