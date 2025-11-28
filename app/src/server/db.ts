import { PrismaClient } from "@prisma/client"

import { logger } from "./logger"

declare global {
  var __prisma: PrismaClient | undefined
}

// Share a single Prisma client instance across hot reloads.
export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  })

if (!globalThis.__prisma) {
  logger.info("Bootstrapping Prisma client")
  globalThis.__prisma = prisma
}


