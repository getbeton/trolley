import { createAdminClient } from "../../lib/supabase/server"
import { logger } from "../logger"

const DEMO_USER_EMAIL = "demo@betontrolley.local"

/**
 * Ensures we always have a user row to associate entities/migrations with
 * while proper authentication is still pending.
 */
export async function getOrCreateDemoUser() {
  logger.info("Ensuring demo user exists", { email: DEMO_USER_EMAIL })

  const supabase = createAdminClient()

  // Check if user exists
  const { data: existingUser } = await supabase
    .from("User")
    .select("*")
    .eq("email", DEMO_USER_EMAIL)
    .maybeSingle()

  if (existingUser) {
    return existingUser
  }

  // Create new user
  const { data: user, error } = await supabase
    .from("User")
    .insert({
      email: DEMO_USER_EMAIL,
      displayName: "Beton Demo",
      organization: "Beton Trolley",
    })
    .select()
    .single()

  if (error) throw error
  return user
}






