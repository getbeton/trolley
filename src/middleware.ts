import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAuthDomain } from "./lib/utils/domain"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Detect which domain we're on
  const hostname = request.headers.get("host") || ""
  const isAuth = isAuthDomain(hostname)

  // Skip auth in development mode
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return supabaseResponse
  }

  // Use AUTH client for authentication checks
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookie domain to parent domain for cross-subdomain auth
            const cookieOptions = {
              ...options,
              domain: process.env.NODE_ENV === "production" ? ".getbeton.ai" : undefined,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax" as const,
            }
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes - redirect to sign in if not authenticated
  const publicPaths = ["/auth", "/api/auth", "/signin"]
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // If on auth domain, allow access to sign-in page
  if (isAuth && request.nextUrl.pathname === "/signin") {
    return supabaseResponse
  }

  // If not authenticated and not on public path
  if (!user && !isPublicPath) {
    // If on trolley domain (or other app domains), redirect to auth domain
    if (!isAuth) {
      // Don't manually encode - URLSearchParams.set() will handle encoding
      const authURL = new URL("https://auth.getbeton.ai/signin")
      authURL.searchParams.set("return", request.url)
      return NextResponse.redirect(authURL)
    }

    // If on auth domain and trying to access non-signin page, redirect to signin
    if (isAuth && request.nextUrl.pathname !== "/signin") {
      return NextResponse.redirect(new URL("/signin", request.url))
    }
  }

  // If on auth domain and authenticated at /signin, redirect to trolley
  if (isAuth && user && request.nextUrl.pathname === "/signin") {
    return NextResponse.redirect("https://trolley.getbeton.ai")
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}