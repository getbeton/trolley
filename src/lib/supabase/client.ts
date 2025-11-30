import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

/**
 * Creates a Supabase client for client-side operations (Client Components)
 * This client maintains the user session through cookies
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
