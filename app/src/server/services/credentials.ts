import { Database } from "../../lib/supabase/types"
import { createAdminClient } from "../../lib/supabase/server"
import { logger } from "../logger"

type CredentialStatus = Database["public"]["Enums"]["CredentialStatus"]
type CredentialType = Database["public"]["Enums"]["CredentialType"]
type Json = Database["public"]["Tables"]["Credential"]["Row"]["metadata"]

export interface UpsertCredentialInput {
  userId: string
  type: CredentialType
  secret: string
  status: CredentialStatus
  metadata?: Json
  validationMessage?: string | null
}

/**
 * Stores or updates a credential row.
 */
export async function upsertCredential(input: UpsertCredentialInput) {
  logger.info("Persisting credential", { type: input.type, userId: input.userId })

  const supabase = createAdminClient()

  // Check if credential exists
  const { data: existing } = await supabase
    .from("Credential")
    .select("id")
    .eq("userId", input.userId)
    .eq("type", input.type)
    .maybeSingle()

  const credentialData = {
    secret: input.secret,
    status: input.status,
    metadata: input.metadata,
    validationMessage: input.validationMessage,
    lastValidatedAt: new Date().toISOString(),
  }

  if (existing) {
    // Update existing credential
    const { data, error } = await supabase
      .from("Credential")
      .update({
        ...credentialData,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new credential
    const { data, error } = await supabase
      .from("Credential")
      .insert({
        userId: input.userId,
        type: input.type,
        ...credentialData,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Retrieves a credential or returns null if it has not been recorded yet.
 */
export async function getCredential(userId: string, type: CredentialType) {
  logger.debug("Fetching credential", { type, userId })

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("Credential")
    .select("*")
    .eq("userId", userId)
    .eq("type", type)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetches a credential and throws if it was not validated yet.
 */
export async function requireCredential(userId: string, type: CredentialType) {
  const credential = await getCredential(userId, type)

  if (!credential || credential.status !== ("VALID" as CredentialStatus)) {
    throw new Error(`Credential ${type} is missing or invalid`)
  }

  return credential
}






