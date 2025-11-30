import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/server"
import { logger } from "@/server/logger"

export async function GET() {
  logger.info("Health check requested")

  let database = "ok"
  let userCount = 0

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from("User")
      .select("*", { count: "exact", head: true })

    if (error) throw error
    userCount = count ?? 0
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

