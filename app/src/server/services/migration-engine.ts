import { LogLevel, MigrationStatus, RunStatus } from "@prisma/client"

import { prisma } from "../db"
import { logger } from "../logger"

const RATE_LIMIT_DELAY_MS = Number(process.env.MIGRATION_RATE_LIMIT_MS ?? 500)
const DEFAULT_BATCHES = 5

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface QueueRunInput {
  userId: string
  name: string
  description?: string
  recordEstimate?: number
  etaSeconds?: number
}

/**
 * Creates (or reuses) a migration definition and queues a run in the database.
 */
export async function queueMigrationRun({
  userId,
  name,
  description,
  recordEstimate,
  etaSeconds,
}: QueueRunInput) {
  logger.info("Queueing migration run", { userId, name })

  const migration = await prisma.migration.upsert({
    where: { userId_name: { userId, name } },
    update: {
      description,
      recordEstimate,
      etaSeconds,
      status: MigrationStatus.READY,
    },
    create: {
      userId,
      name,
      description,
      recordEstimate,
      etaSeconds,
      status: MigrationStatus.READY,
    },
  })

  const run = await prisma.migrationRun.create({
    data: {
      migrationId: migration.id,
      status: RunStatus.QUEUED,
      progress: 0,
      etaSeconds: etaSeconds ?? 0,
      recordsProcessed: 0,
    },
  })

  return { migration, run }
}

/**
 * Executes a queued migration run with a deterministic delay to respect rate limits.
 */
export async function executeRun(runId: string, batches = DEFAULT_BATCHES) {
  logger.info("Executing migration run", { runId, batches })

  let run = await prisma.migrationRun.update({
    where: { id: runId },
    data: {
      status: RunStatus.RUNNING,
      startedAt: new Date(),
    },
    include: {
      migration: true,
    },
  })

  for (let batch = 1; batch <= batches; batch++) {
    await sleep(RATE_LIMIT_DELAY_MS)

    const progress = Math.round((batch / batches) * 100)
    const recordsProcessed = batch * 100

    run = await prisma.migrationRun.update({
      where: { id: runId },
      data: {
        progress,
        recordsProcessed,
        etaSeconds: (batches - batch) * Math.ceil(RATE_LIMIT_DELAY_MS / 1000),
      },
      include: {
        migration: true,
      },
    })

    await prisma.migrationLog.create({
      data: {
        runId,
        level: LogLevel.INFO,
        message: `Processed batch ${batch}/${batches}`,
        context: {
          rateLimitDelayMs: RATE_LIMIT_DELAY_MS,
          recordsProcessed,
        },
      },
    })
  }

  await prisma.migrationRun.update({
    where: { id: runId },
    data: {
      status: RunStatus.SUCCEEDED,
      completedAt: new Date(),
      progress: 100,
      recordsProcessed: run.recordsProcessed,
    },
  })

  await prisma.migration.update({
    where: { id: run.migrationId },
    data: {
      status: MigrationStatus.COMPLETED,
      lastRunAt: new Date(),
    },
  })

  logger.info("Migration run completed", { runId })
}

/**
 * Fetches runs with the most recent log entries for dashboard views.
 */
export async function listRunsWithLogs(userId: string) {
  const runs = await prisma.migrationRun.findMany({
    where: {
      migration: { userId },
    },
    orderBy: [{ startedAt: "desc" }],
    take: 5,
    include: {
      migration: true,
      logs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })

  return runs
}


