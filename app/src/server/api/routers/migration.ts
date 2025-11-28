import { z } from "zod"

import { router, publicProcedure } from "../trpc"
import { queueMigrationRun, listRunsWithLogs } from "../../services/migration-engine"
import { logger } from "../../logger"

export const migrationRouter = router({
  queueRun: publicProcedure
    .input(
      z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        recordEstimate: z.number().int().positive().optional(),
        etaSeconds: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { name, description, recordEstimate, etaSeconds } = input

      const { migration, run } = await queueMigrationRun({
        userId: user.id,
        name,
        description,
        recordEstimate,
        etaSeconds,
      })

      logger.info("Queued migration run from API", { migrationId: migration.id, runId: run.id })

      return {
        migrationId: migration.id,
        runId: run.id,
        executeEndpoint: "/api/migrations/run",
      }
    }),
  listRuns: publicProcedure.query(async ({ ctx }) => {
    const runs = await listRunsWithLogs(ctx.user.id)
    return runs
  }),
  notifications: publicProcedure.query(async ({ ctx }) => {
    const notifications = await ctx.prisma.webhookNotification.findMany({
      where: {
        run: {
          migration: { userId: ctx.user.id },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return notifications
  }),
})


