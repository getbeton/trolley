import {
  CredentialType,
  LogLevel,
  MigrationStatus,
  RunStatus,
  WebhookEvent,
  WebhookStatus,
} from "@prisma/client"

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

  const finalizedRun = await prisma.migrationRun.update({
    where: { id: runId },
    data: {
      status: RunStatus.SUCCEEDED,
      completedAt: new Date(),
      progress: 100,
      recordsProcessed: run.recordsProcessed,
    },
    include: { migration: true },
  })

  await prisma.migration.update({
    where: { id: run.migrationId },
    data: {
      status: MigrationStatus.COMPLETED,
      lastRunAt: new Date(),
    },
  })

  await deliverWebhookNotification(finalizedRun.id)

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

async function deliverWebhookNotification(runId: string) {
  const run = await prisma.migrationRun.findUnique({
    where: { id: runId },
    include: { migration: true },
  })

  if (!run) {
    logger.warn("Run not found when attempting to deliver webhook", { runId })
    return
  }

  const webhook = await prisma.credential.findUnique({
    where: {
      userId_type: {
        userId: run.migration.userId,
        type: CredentialType.NOTIFICATION_WEBHOOK,
      },
    },
  })

  if (!webhook) {
    logger.info("No notification webhook configured, skipping delivery")
    return
  }

  const notification = await prisma.webhookNotification.create({
    data: {
      runId,
      event: WebhookEvent.MIGRATION_COMPLETED,
      status: WebhookStatus.PENDING,
      targetUrl: webhook.secret,
      payload: {
        migration: run.migration.name,
        runId,
        recordsProcessed: run.recordsProcessed,
        completedAt: run.completedAt,
      },
    },
  })

  try {
    const response = await fetch(webhook.secret, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification.payload),
    })

    await prisma.webhookNotification.update({
      where: { id: notification.id },
      data: {
        status: response.ok ? WebhookStatus.DELIVERED : WebhookStatus.FAILED,
        responseStatusCode: response.status,
        responseBody: await response.text(),
        deliveredAt: response.ok ? new Date() : null,
        attemptCount: notification.attemptCount + 1,
        lastAttemptAt: new Date(),
      },
    })
  } catch (error) {
    logger.error("Webhook delivery failed", error as Error)
    await prisma.webhookNotification.update({
      where: { id: notification.id },
      data: {
        status: WebhookStatus.FAILED,
        responseBody: error instanceof Error ? error.message : "Unknown failure",
        attemptCount: notification.attemptCount + 1,
        lastAttemptAt: new Date(),
      },
    })
  }
}


