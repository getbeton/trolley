import { CredentialType } from "@prisma/client"
import { z } from "zod"

import { router, publicProcedure } from "../trpc"
import { requireCredential } from "../../services/credentials"
import {
  listTwentyEntities,
  listTwentyFields,
  sampleTwentyRecords,
} from "../../services/twenty"
import {
  listAttioObjects,
  listAttioFields,
  sampleAttioRecords,
} from "../../services/attio"
import { logger } from "../../logger"

const entityNameInput = z.object({
  entityName: z.string().min(1),
})

export const entityRouter = router({
  listTwenty: publicProcedure.query(async ({ ctx }) => {
    const { user } = ctx
    const baseUrl = await requireCredential(user.id, CredentialType.TWENTY_BASE_URL)
    const token = await requireCredential(user.id, CredentialType.TWENTY_API_TOKEN)

    const entities = await listTwentyEntities(baseUrl.secret, token.secret)
    logger.info("Fetched Twenty entities", { count: entities.length })
    return entities
  }),
  listTwentyFields: publicProcedure
    .input(entityNameInput)
    .query(async ({ ctx, input }) => {
      const { user } = ctx
      const baseUrl = await requireCredential(user.id, CredentialType.TWENTY_BASE_URL)
      const token = await requireCredential(user.id, CredentialType.TWENTY_API_TOKEN)

      return listTwentyFields(baseUrl.secret, token.secret, input.entityName)
    }),
  sampleTwenty: publicProcedure
    .input(entityNameInput.extend({ limit: z.number().int().min(1).max(25).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const baseUrl = await requireCredential(user.id, CredentialType.TWENTY_BASE_URL)
      const token = await requireCredential(user.id, CredentialType.TWENTY_API_TOKEN)

      return sampleTwentyRecords(baseUrl.secret, token.secret, input.entityName, input.limit)
    }),
  listAttio: publicProcedure.query(async ({ ctx }) => {
    const { user } = ctx
    const token = await requireCredential(user.id, CredentialType.ATTIO_API_TOKEN)

    const objects = await listAttioObjects(token.secret)
    logger.info("Fetched Attio objects", { count: objects.length })
    return objects
  }),
  listAttioFields: publicProcedure
    .input(z.object({ objectName: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx
      const token = await requireCredential(user.id, CredentialType.ATTIO_API_TOKEN)

      return listAttioFields(token.secret, input.objectName)
    }),
  sampleAttio: publicProcedure
    .input(
      z.object({
        objectName: z.string().min(1),
        limit: z.number().int().min(1).max(25).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const token = await requireCredential(user.id, CredentialType.ATTIO_API_TOKEN)

      return sampleAttioRecords(token.secret, input.objectName, input.limit)
    }),
})


