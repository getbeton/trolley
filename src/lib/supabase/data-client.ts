import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a Supabase client for data operations (browser/client-side)
 *
 * This client connects to the trolley-specific data project and should be used for:
 * - Querying migrations, credentials, selections
 * - Creating/updating app-specific data
 * - Real-time subscriptions to app data
 *
 * Environment variables:
 * - Production: Points to beton-trolley (nuxwbqovsllgceswaxgf)
 * - Development: Points to beton-test (egmmuxzfmbnfivxlqsyi)
 *
 * Note: User ID comes from auth client, data queries use that ID
 */
export function createDataClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATA_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_DATA_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
