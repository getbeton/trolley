import { logger } from "../logger"
import { fetchJson } from "./http"

const DEFAULT_SAMPLE_LIMIT = 5

interface TwentyEntity {
  id: string
  nameSingular: string
  namePlural: string
  labelSingular: string
  labelPlural: string
  isCustom: boolean
  isActive: boolean
  isSystem: boolean
  description: string | null
  icon: string | null
  fields: Array<{
    id: string
    name: string
    label: string
    type: string
    isNullable: boolean
    isCustom: boolean
    isActive: boolean
    isSystem: boolean
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
 * Uses the REST API to fetch a minimal amount of data.
 */
export async function validateTwentyToken(baseUrl: string, token: string) {
  logger.info("Validating Twenty token", { baseUrl })

  const url = new URL("/rest/people?limit=1", baseUrl).toString()
  await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return { ok: true }
}

/**
 * Retrieves all custom + core entities from Twenty using the REST metadata API.
 * Filters out system objects to show only user-facing CRM entities.
 */
export async function listTwentyEntities(baseUrl: string, token: string) {
  logger.info("Fetching Twenty entities", { baseUrl })

  const url = new URL("/rest/metadata/objects", baseUrl).toString()
  const response = await fetchJson<{ data: { objects: TwentyEntity[] } }>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Filter out system objects - only show user-facing entities like person, company, opportunity
  const userEntities = response.data.objects.filter(entity => !entity.isSystem)

  logger.info("Filtered Twenty entities", {
    total: response.data.objects.length,
    userFacing: userEntities.length
  })

  return userEntities
}

/**
 * Pulls all fields for a single entity using the REST metadata API.
 */
export async function listTwentyFields(baseUrl: string, token: string, entityName: string) {
  logger.info("Fetching Twenty fields", { baseUrl, entityName })

  const url = new URL(`/rest/metadata/objects/${entityName}`, baseUrl).toString()
  const response = await fetchJson<{ data: { object: TwentyEntity } }>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data.object.fields
}

/**
 * Fetches a small sample of raw records for preview purposes using the REST API.
 * Note: entityName should be the plural form (e.g., "workflows", "people", "companies")
 */
export async function sampleTwentyRecords(
  baseUrl: string,
  token: string,
  entityName: string,
  limit = DEFAULT_SAMPLE_LIMIT
) {
  logger.info("Fetching Twenty record sample", { baseUrl, entityName, limit })

  const url = new URL(
    `/rest/${entityName}?limit=${limit}`,
    baseUrl
  ).toString()
  const response = await fetchJson<{ data: { [key: string]: Record<string, unknown>[] } }>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // The REST API returns { data: { [entityName]: [...records] } }
  return response.data[entityName] || []
}






