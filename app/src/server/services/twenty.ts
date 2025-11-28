import { logger } from "../logger"
import { fetchJson } from "./http"

const DEFAULT_SAMPLE_LIMIT = 5

interface TwentyEntity {
  name: string
  label: string
  fields: Array<{
    name: string
    label: string
    type: string
    required: boolean
  }>
}

interface TwentyRecordResponse {
  data: Record<string, unknown>[]
}

interface TwentyEntityListResponse {
  data: TwentyEntity[]
}

/**
 * Performs a lightweight validation by hitting the Twenty identity endpoint.
 */
export async function validateTwentyToken(baseUrl: string, token: string) {
  logger.info("Validating Twenty token", { baseUrl })

  const url = new URL("/api/v1/users/me", baseUrl).toString()
  await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return { ok: true }
}

/**
 * Retrieves all custom + core entities from Twenty.
 */
export async function listTwentyEntities(baseUrl: string, token: string) {
  logger.info("Fetching Twenty entities", { baseUrl })

  const url = new URL("/api/v1/entities", baseUrl).toString()
  const response = await fetchJson<TwentyEntityListResponse>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}

/**
 * Pulls all fields for a single entity.
 */
export async function listTwentyFields(baseUrl: string, token: string, entityName: string) {
  logger.info("Fetching Twenty fields", { baseUrl, entityName })

  const url = new URL(`/api/v1/entities/${entityName}/fields`, baseUrl).toString()
  const entity = await fetchJson<TwentyEntity>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return entity.fields
}

/**
 * Fetches a small sample of raw records for preview purposes.
 */
export async function sampleTwentyRecords(
  baseUrl: string,
  token: string,
  entityName: string,
  limit = DEFAULT_SAMPLE_LIMIT
) {
  logger.info("Fetching Twenty record sample", { baseUrl, entityName, limit })

  const url = new URL(
    `/api/v1/entities/${entityName}/records?limit=${limit}`,
    baseUrl
  ).toString()
  const response = await fetchJson<TwentyRecordResponse>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}


