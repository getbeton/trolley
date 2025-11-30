import { initTRPC } from "@trpc/server"
import superjson from "superjson"

import { createClient } from "../../lib/supabase/server"
import { getCurrentUser, ensureDevUser } from "../../lib/supabase/auth-helpers"
import { logger } from "../logger"

export const createContext = async () => {
  // Ensure dev user exists in dev mode
  await ensureDevUser()

  const user = await getCurrentUser()

  if (!user) {
    logger.warn("No user context available")
    throw new Error("Unauthorized: Please sign in to continue")
  }

  logger.debug("Resolved request context", { userId: user.id })

  const supabase = await createClient()

  return {
    supabase,
    user,
  }
}
export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure





