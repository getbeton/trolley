import { Database } from "../../lib/supabase/types"
import { createAdminClient } from "../../lib/supabase/server"
import { logger } from "../logger"

type CredentialType = Database["public"]["Enums"]["CredentialType"]
type LogLevel = Database["public"]["Enums"]["LogLevel"]
type MigrationStatus = Database["public"]["Enums"]["MigrationStatus"]
type RunStatus = Database["public"]["Enums"]["RunStatus"]
type WebhookEvent = Database["public"]["Enums"]["WebhookEvent"]
type WebhookStatus = Database["public"]["Enums"]["WebhookStatus"]

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

  const supabase = createAdminClient()

  // Check if migration exists
  const { data: existingMigration } = await supabase
    .from("Migration")
    .select("*")
    .eq("userId", userId)
    .eq("name", name)
    .maybeSingle()

  let migration
  if (existingMigration) {
    // Update existing migration
    const { data, error } = await supabase
      .from("Migration")
      .update({
        description,
        recordEstimate,
        etaSeconds,
        status: "READY" as MigrationStatus,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existingMigration.id)
      .select()
      .single()

    if (error) throw error
    migration = data
  } else {
    // Create new migration
    const { data, error } = await supabase
      .from("Migration")
      .insert({
        userId,
        name,
        description,
        recordEstimate,
        etaSeconds,
        status: "READY" as MigrationStatus,
      })
      .select()
      .single()

    if (error) throw error
    migration = data
  }

  // Create migration run
  const { data: run, error: runError } = await supabase
    .from("MigrationRun")
    .insert({
      migrationId: migration.id,
      status: "QUEUED" as RunStatus,
      progress: 0,
      etaSeconds: etaSeconds ?? 0,
      recordsProcessed: 0,
    })
    .select()
    .single()

  if (runError) throw runError

  return { migration, run }
}

/**
 * Executes a queued migration run with a deterministic delay to respect rate limits.
 */
export async function executeRun(runId: string, batches = DEFAULT_BATCHES) {
  logger.info("Executing migration run", { runId, batches })

  const supabase = createAdminClient()

  // Start the run
  const { data: run, error: startError } = await supabase
    .from("MigrationRun")
    .update({
      status: "RUNNING" as RunStatus,
      startedAt: new Date().toISOString(),
    })
    .eq("id", runId)
    .select("*, migration:Migration(*)")
    .single()

  if (startError) throw startError

  let currentRun = run

  for (let batch = 1; batch <= batches; batch++) {
    await sleep(RATE_LIMIT_DELAY_MS)

    const progress = Math.round((batch / batches) * 100)
    const recordsProcessed = batch * 100

    // Update progress
    const { data: updatedRun, error: updateError } = await supabase
      .from("MigrationRun")
      .update({
        progress,
        recordsProcessed,
        etaSeconds: (batches - batch) * Math.ceil(RATE_LIMIT_DELAY_MS / 1000),
      })
      .eq("id", runId)
      .select("*, migration:Migration(*)")
      .single()

    if (updateError) throw updateError
    currentRun = updatedRun

    // Create log entry
    const { error: logError } = await supabase
      .from("MigrationLog")
      .insert({
        runId,
        level: "INFO" as LogLevel,
        message: `Processed batch ${batch}/${batches}`,
        context: {
          rateLimitDelayMs: RATE_LIMIT_DELAY_MS,
          recordsProcessed,
        },
      })

    if (logError) throw logError
  }

  // Finalize the run
  const { data: finalizedRun, error: finalizeError } = await supabase
    .from("MigrationRun")
    .update({
      status: "SUCCEEDED" as RunStatus,
      completedAt: new Date().toISOString(),
      progress: 100,
      recordsProcessed: currentRun.recordsProcessed,
    })
    .eq("id", runId)
    .select("*, migration:Migration(*)")
    .single()

  if (finalizeError) throw finalizeError

  // Update migration status
  const { error: migrationError } = await supabase
    .from("Migration")
    .update({
      status: "COMPLETED" as MigrationStatus,
      lastRunAt: new Date().toISOString(),
    })
    .eq("id", currentRun.migrationId)

  if (migrationError) throw migrationError

  await deliverWebhookNotification(finalizedRun.id)

  logger.info("Migration run completed", { runId })
}

/**
 * Fetches runs with the most recent log entries for dashboard views.
 */
export async function listRunsWithLogs(userId: string) {
  const supabase = createAdminClient()

  const { data: runs, error } = await supabase
    .from("MigrationRun")
    .select(`
      *,
      migration:Migration!inner(*),
      logs:MigrationLog(*)
    `)
    .eq("migration.userId", userId)
    .order("startedAt", { ascending: false })
    .limit(5)

  if (error) throw error

  // Return empty array if no runs found
  if (!runs || runs.length === 0) {
    return []
  }

  // Sort logs for each run (Supabase doesn't support nested orderBy in a single query)
  return runs.map((run) => ({
    ...run,
    logs: (run.logs || [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  }))
}

async function deliverWebhookNotification(runId: string) {
  const supabase = createAdminClient()

  // Find run with migration
  const { data: run, error: runError } = await supabase
    .from("MigrationRun")
    .select("*, migration:Migration(*)")
    .eq("id", runId)
    .maybeSingle()

  if (runError) {
    logger.error("Error fetching run for webhook notification", { runId, error: runError })
    throw runError
  }

  if (!run) {
    logger.warn("Run not found when attempting to deliver webhook", { runId })
    return
  }

  // Verify migration is properly joined
  if (!run.migration) {
    logger.error("Migration not found on run", { runId })
    return
  }

  logger.info("Preparing webhook notification", {
    runId,
    migrationId: run.migrationId,
    userId: run.migration.userId,
  })

  // Find webhook credential with compound key
  const { data: webhook, error: webhookError } = await supabase
    .from("Credential")
    .select("*")
    .eq("userId", run.migration.userId)
    .eq("type", "NOTIFICATION_WEBHOOK" as CredentialType)
    .maybeSingle()

  if (webhookError) {
    logger.error("Error fetching webhook credential", { error: webhookError })
  }

  if (!webhook) {
    logger.info("No notification webhook configured, skipping delivery", {
      userId: run.migration.userId,
    })
    return
  }

  logger.info("Found webhook credential, creating notification", {
    webhookUrl: webhook.secret,
    runId,
  })

  // Create notification
  const { data: notification, error: notificationError } = await supabase
    .from("WebhookNotification")
    .insert({
      runId,
      event: "MIGRATION_COMPLETED" as WebhookEvent,
      status: "PENDING" as WebhookStatus,
      targetUrl: webhook.secret,
      payload: {
        migration: run.migration.name,
        runId,
        status: run.status,
        progress: run.progress,
        recordsProcessed: run.recordsProcessed,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
    })
    .select()
    .single()

  if (notificationError) {
    logger.error("Error creating webhook notification", { error: notificationError })
    throw notificationError
  }

  logger.info("Sending webhook notification", {
    notificationId: notification.id,
    targetUrl: webhook.secret,
  })

  try {
    const response = await fetch(webhook.secret, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Beton-Trolley-Webhook/1.0",
      },
      body: JSON.stringify(notification.payload),
    })

    const responseBody = await response.text()

    logger.info("Webhook response received", {
      notificationId: notification.id,
      status: response.status,
      ok: response.ok,
    })

    const { error: updateError } = await supabase
      .from("WebhookNotification")
      .update({
        status: (response.ok ? "DELIVERED" : "FAILED") as WebhookStatus,
        responseStatusCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit response body size
        deliveredAt: response.ok ? new Date().toISOString() : null,
        attemptCount: notification.attemptCount + 1,
        lastAttemptAt: new Date().toISOString(),
      })
      .eq("id", notification.id)

    if (updateError) {
      logger.error("Error updating notification status", { error: updateError })
    }

    if (response.ok) {
      logger.info("Webhook delivered successfully", { notificationId: notification.id })
    } else {
      logger.warn("Webhook delivery failed with non-ok status", {
        notificationId: notification.id,
        status: response.status,
      })
    }
  } catch (error) {
    logger.error("Webhook delivery failed with exception", {
      notificationId: notification.id,
      error: error instanceof Error ? error.message : "Unknown failure",
    })

    const { error: updateError } = await supabase
      .from("WebhookNotification")
      .update({
        status: "FAILED" as WebhookStatus,
        responseBody: error instanceof Error ? error.message : "Unknown failure",
        attemptCount: notification.attemptCount + 1,
        lastAttemptAt: new Date().toISOString(),
      })
      .eq("id", notification.id)

    if (updateError) {
      logger.error("Error updating notification status after failure", { error: updateError })
    }
  }
}


