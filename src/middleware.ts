import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/director", "/historial", "/jornada", "/line", "/scrum", "/salidas", "/ataque", "/defensa", "/pie"];

// Routes that require superadmin role
const ADMIN_ROUTES = ["/director"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check protected routes
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // Create Supabase client with cookie handling
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes → check superadmin role
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminRoute) {
    const role = (user.user_metadata as Record<string, string>)?.role;
    if (role !== "superadmin") {
      // Non-admin trying to access /director → redirect to historial
      return NextResponse.redirect(new URL("/historial", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/director/:path*",
    "/historial/:path*",
    "/jornada/:path*",
    "/line/:path*",
    "/scrum/:path*",
    "/salidas/:path*",
    "/ataque/:path*",
    "/defensa/:path*",
    "/pie/:path*",
  ],
};
