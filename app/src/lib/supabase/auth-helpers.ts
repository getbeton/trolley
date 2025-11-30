import { createClient, createAdminClient } from "./server"
import { logger } from "../../server/logger"

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000"
const DEV_USER_EMAIL = "dev@betontrolley.local"

/**
 * Get the current authenticated user
 * In development mode, returns a demo user
 * In production, requires actual authentication
 */
export async function getCurrentUser() {
  // Dev mode bypass - skip authentication
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    logger.info("Dev mode: bypassing authentication")
    return {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      displayName: "Dev User",
      organization: "Beton Trolley Dev",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    logger.warn("No authenticated user found", { error: error?.message })
    return null
  }

  // Fetch user data from our User table
  const { data: userData } = await supabase
    .from("User")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!userData) {
    logger.error("User authenticated but not found in User table", {
      userId: user.id,
    })
    return null
  }

  return {
    id: userData.id,
    email: userData.email,
    displayName: userData.displayName,
    organization: userData.organization,
  }
}

/**
 * Ensure dev user exists in database (dev mode only)
 * Creates a user with predictable UUID for local development
 */
export async function ensureDevUser() {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    return
  }

  const supabase = createAdminClient()

  try {
    const { data: existingUser } = await supabase
      .from("User")
      .select("id")
      .eq("id", DEV_USER_ID)
      .single()

    if (!existingUser) {
      logger.info("Creating dev user in database")
      await supabase.from("User").insert({
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        displayName: "Dev User",
        organization: "Beton Trolley Dev",
      })
    }
  } catch (error) {
    logger.error("Failed to ensure dev user exists", { error })
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
