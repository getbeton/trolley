import { logger } from "../logger"
import { fetchJson } from "./http"

const ATTIO_API_BASE = "https://api.attio.com/v2"
const DEFAULT_SAMPLE_LIMIT = 5

interface AttioObject {
  object_name: string
  label: string
  fields: Array<{
    name: string
    label: string
    type: string
    required: boolean
  }>
}

interface AttioListResponse<T> {
  data: T[]
}

interface AttioRecordResponse {
  data: {
    records: Record<string, unknown>[]
  }
}

const attioHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
})

/**
 * Validates an Attio API token via the /me endpoint.
 */
export async function validateAttioToken(token: string) {
  logger.info("Validating Attio token")

  const url = `${ATTIO_API_BASE}/me`
  await fetchJson(url, {
    headers: attioHeaders(token),
  })

  return { ok: true }
}

/**
 * Lists Attio objects so the UI can mirror the destination schema.
 */
export async function listAttioObjects(token: string) {
  logger.info("Fetching Attio objects")

  const url = `${ATTIO_API_BASE}/objects`
  const response = await fetchJson<AttioListResponse<AttioObject>>(url, {
    headers: attioHeaders(token),
  })

  return response.data
}

/**
 * Fetches field metadata for a given Attio object.
 */
export async function listAttioFields(token: string, objectName: string) {
  logger.info("Fetching Attio fields", { objectName })

  const url = `${ATTIO_API_BASE}/objects/${objectName}`
  const response = await fetchJson<{ data: AttioObject }>(url, {
    headers: attioHeaders(token),
  })

  return response.data.fields
}

/**
 * Samples Attio records for preview before executing a migration.
 */
export async function sampleAttioRecords(
  token: string,
  objectName: string,
  limit = DEFAULT_SAMPLE_LIMIT
) {
  logger.info("Fetching Attio record sample", { objectName, limit })

  const url = `${ATTIO_API_BASE}/objects/${objectName}/records?limit=${limit}`
  const response = await fetchJson<AttioRecordResponse>(url, {
    headers: attioHeaders(token),
  })

  return response.data.records
}


