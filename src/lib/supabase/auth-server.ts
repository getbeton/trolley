import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for authentication operations (server-side)
 *
 * This client connects to the shared beton-auth project and should be used for:
 * - Server-side user authentication checks
 * - Middleware authentication
 * - API route authentication
 * - Server component user queries
 *
 * Environment variables:
 * - Production: Points to beton-auth (uezyvflphqcizcbfklla)
 * - Development: Points to beton-test (egmmuxzfmbnfivxlqsyi)
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates an admin Supabase client for auth operations with elevated privileges
 * Uses service role key - ONLY use on server-side, never expose to client
 */
export function createAuthAdminClient() {
  const { createClient } = require("@supabase/supabase-js")

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL!,
    process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
