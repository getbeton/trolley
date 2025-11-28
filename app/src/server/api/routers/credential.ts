import { CredentialStatus, CredentialType } from "@prisma/client"
import { z } from "zod"

import { router, publicProcedure } from "../trpc"
import { upsertCredential } from "../../services/credentials"
import { validateTwentyToken } from "../../services/twenty"
import { validateAttioToken } from "../../services/attio"
import { validateToolToken } from "../../services/tool"

const credentialInput = z.object({
  type: z.nativeEnum(CredentialType),
  secret: z.string().min(1),
  baseUrl: z.string().url().optional(),
})

export const credentialRouter = router({
  validate: publicProcedure
    .input(credentialInput)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { type, secret, baseUrl } = input

      switch (type) {
        case CredentialType.TWENTY_BASE_URL: {
          if (!baseUrl) {
            throw new Error("Base URL is required for Twenty")
          }

          await upsertCredential({
            userId: user.id,
            type,
            secret: baseUrl,
            status: CredentialStatus.VALID,
          })
          break
        }
        case CredentialType.TWENTY_API_TOKEN: {
          if (!baseUrl) {
            throw new Error("Base URL is required to validate the Twenty token")
          }

          await validateTwentyToken(baseUrl, secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: CredentialStatus.VALID,
            metadata: { baseUrl },
          })
          break
        }
        case CredentialType.TOOL_TOKEN: {
          const result = await validateToolToken(secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: CredentialStatus.VALID,
            metadata: result,
          })
          break
        }
        case CredentialType.ATTIO_API_TOKEN: {
          await validateAttioToken(secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: CredentialStatus.VALID,
          })
          break
        }
        default:
          throw new Error(`Unhandled credential type ${type satisfies never}`)
      }

      return { status: "ok" }
    }),
})


