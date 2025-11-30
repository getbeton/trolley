import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a Supabase client for authentication operations (browser/client-side)
 *
 * This client connects to the shared beton-auth project and should be used for:
 * - User sign in/sign up
 * - OAuth flows (Google, GitHub, etc.)
 * - Session management
 * - User profile queries
 *
 * Environment variables:
 * - Production: Points to beton-auth (uezyvflphqcizcbfklla)
 * - Development: Points to beton-test (egmmuxzfmbnfivxlqsyi)
 */
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
