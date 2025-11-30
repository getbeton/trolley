import { Database } from "../../../lib/supabase/types"
import { z } from "zod"

import { router, publicProcedure } from "../trpc"
import { upsertCredential } from "../../services/credentials"
import { validateTwentyToken } from "../../services/twenty"
import { validateAttioToken } from "../../services/attio"
import { validateToolToken } from "../../services/tool"

// Create Zod enum from Supabase enum type
const CredentialTypeEnum = z.enum([
  "TWENTY_BASE_URL",
  "TWENTY_API_TOKEN",
  "TOOL_TOKEN",
  "ATTIO_API_TOKEN",
  "NOTIFICATION_WEBHOOK",
])

const credentialInput = z.object({
  type: CredentialTypeEnum,
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
        case "TWENTY_BASE_URL": {
          if (!baseUrl) {
            throw new Error("Base URL is required for Twenty")
          }

          await upsertCredential({
            userId: user.id,
            type,
            secret: baseUrl,
            status: "VALID",
          })
          break
        }
        case "TWENTY_API_TOKEN": {
          if (!baseUrl) {
            throw new Error("Base URL is required to validate the Twenty token")
          }

          await validateTwentyToken(baseUrl, secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: "VALID",
            metadata: { baseUrl } as any,
          })
          break
        }
        case "TOOL_TOKEN": {
          const result = await validateToolToken(secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: "VALID",
            metadata: result as any,
          })
          break
        }
        case "ATTIO_API_TOKEN": {
          await validateAttioToken(secret)
          await upsertCredential({
            userId: user.id,
            type,
            secret,
            status: "VALID",
          })
          break
        }
        case "NOTIFICATION_WEBHOOK": {
          const url = new URL(secret)
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Webhook URL must be http(s)")
          }

          await upsertCredential({
            userId: user.id,
            type,
            secret: url.toString(),
            status: "VALID",
          })
          break
        }
        default:
          return assertNever(type)
      }

      return { status: "ok" }
    }),
})

const assertNever = (value: never): never => {
  throw new Error(`Unhandled credential type: ${value}`)
}
