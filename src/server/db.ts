/**
 * Database client exports
 * Using Supabase for all database operations
 */

import { createClient, createAdminClient } from "../lib/supabase/server"
import { logger } from "./logger"

// Export Supabase client creators
export { createClient as createSupabaseClient, createAdminClient as createSupabaseAdminClient }

// For backward compatibility during migration, export createClient as default
export const getSupabaseClient = createClient

logger.info("Using Supabase client for database operations")


