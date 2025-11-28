import { initTRPC } from "@trpc/server"
import superjson from "superjson"

import { prisma } from "../db"
import { getOrCreateDemoUser } from "../auth/user"
import { logger } from "../logger"

export const createContext = async () => {
  const user = await getOrCreateDemoUser()
  logger.debug("Resolved request context", { userId: user.id })

  return {
    prisma,
    user,
  }
}
export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

