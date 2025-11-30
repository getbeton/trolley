import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { validateReturnURL } from "./lib/utils/domain"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

  // If not authenticated and not on public path, send to local signin
  if (!user && !isPublicPath) {
    const signinURL = new URL("/signin", request.url)
    signinURL.searchParams.set("return", request.url)
    return NextResponse.redirect(signinURL)
  }

  // Authenticated users visiting /signin should be bounced back to their target
  if (user && request.nextUrl.pathname === "/signin") {
    const requestedReturn = request.nextUrl.searchParams.get("return")
    if (requestedReturn && validateReturnURL(requestedReturn)) {
      return NextResponse.redirect(requestedReturn)
    }
    return NextResponse.redirect(new URL("/", request.url))
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