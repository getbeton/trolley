import { NextResponse } from "next/server"

import { prisma } from "@/server/db"
import { logger } from "@/server/logger"

export async function GET() {
  logger.info("Health check requested")

  let database = "ok"
  let userCount = 0

  try {
    userCount = await prisma.user.count()
  } catch (error) {
    database = "error"
    logger.error("Health check database probe failed", error as Error)
  }

  return NextResponse.json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    users: userCount,
    timestamp: new Date().toISOString(),
  })
}

