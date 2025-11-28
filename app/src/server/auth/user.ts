import { prisma } from "../db"
import { logger } from "../logger"

const DEMO_USER_EMAIL = "demo@betontrolley.local"

/**
 * Ensures we always have a user row to associate entities/migrations with
 * while proper authentication is still pending.
 */
export async function getOrCreateDemoUser() {
  logger.info("Ensuring demo user exists", { email: DEMO_USER_EMAIL })

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    create: {
      email: DEMO_USER_EMAIL,
      displayName: "Beton Demo",
      organization: "Beton Trolley",
    },
    update: {},
  })

  return user
}


