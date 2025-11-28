import { NextResponse } from "next/server"

import { executeRun } from "@/server/services/migration-engine"
import { logger } from "@/server/logger"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const runId = body.runId as string | undefined

  if (!runId) {
    return NextResponse.json({ error: "Missing runId" }, { status: 400 })
  }

  logger.info("Manual migration run trigger received", { runId })

  await executeRun(runId)

  return NextResponse.json({ status: "completed" })
}

