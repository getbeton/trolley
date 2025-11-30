import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for data operations (server-side)
 *
 * This client connects to the trolley-specific data project and should be used for:
 * - Server-side data queries
 * - API routes that manipulate app data
 * - Server components that fetch app data
 *
 * Environment variables:
 * - Production: Points to beton-trolley (nuxwbqovsllgceswaxgf)
 * - Development: Points to beton-test (egmmuxzfmbnfivxlqsyi)
 */
export async function createDataServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY!,
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
 * Creates an admin Supabase client for data operations with elevated privileges
 * Uses service role key - ONLY use on server-side, never expose to client
 */
export function createDataAdminClient() {
  const { createClient } = require("@supabase/supabase-js")

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL!,
    process.env.SUPABASE_DATA_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
