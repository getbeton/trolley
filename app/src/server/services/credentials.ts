import {
  CredentialStatus,
  CredentialType,
  Prisma,
} from "@prisma/client"

import { prisma } from "../db"
import { logger } from "../logger"

export interface UpsertCredentialInput {
  userId: string
  type: CredentialType
  secret: string
  status: CredentialStatus
  metadata?: Prisma.InputJsonValue
  validationMessage?: string | null
}

/**
 * Stores or updates a credential row.
 */
export async function upsertCredential(input: UpsertCredentialInput) {
  logger.info("Persisting credential", { type: input.type, userId: input.userId })

  return prisma.credential.upsert({
    where: {
      userId_type: {
        userId: input.userId,
        type: input.type,
      },
    },
    update: {
      secret: input.secret,
      status: input.status,
      metadata: input.metadata,
      validationMessage: input.validationMessage,
      lastValidatedAt: new Date(),
    },
    create: {
      userId: input.userId,
      type: input.type,
      secret: input.secret,
      status: input.status,
      metadata: input.metadata,
      validationMessage: input.validationMessage,
      lastValidatedAt: new Date(),
    },
  })
}

/**
 * Retrieves a credential or returns null if it has not been recorded yet.
 */
export async function getCredential(userId: string, type: CredentialType) {
  logger.debug("Fetching credential", { type, userId })

  return prisma.credential.findUnique({
    where: {
      userId_type: {
        userId,
        type,
      },
    },
  })
}

/**
 * Fetches a credential and throws if it was not validated yet.
 */
export async function requireCredential(userId: string, type: CredentialType) {
  const credential = await getCredential(userId, type)

  if (!credential || credential.status !== CredentialStatus.VALID) {
    throw new Error(`Credential ${type} is missing or invalid`)
  }

  return credential
}


