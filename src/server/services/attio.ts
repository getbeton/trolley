import { logger } from "../logger"
import { fetchJson } from "./http"

const ATTIO_API_BASE = "https://api.attio.com/v2"
const DEFAULT_SAMPLE_LIMIT = 5

interface AttioObjectRaw {
  id: {
    workspace_id: string
    object_id: string
  }
  api_slug: string
  singular_noun: string
  plural_noun: string
  created_at: string
}

interface AttioObject {
  id?: string
  object_name: string
  label: string
  fields?: Array<{
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
  data: Record<string, unknown>[]
}

const attioHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
})

/**
 * Validates an Attio API token via the /self endpoint (Identify endpoint).
 * This endpoint identifies the current access token, workspace, and permissions.
 */
export async function validateAttioToken(token: string) {
  logger.info("Validating Attio token")

  const url = `${ATTIO_API_BASE}/self`
  await fetchJson(url, {
    headers: attioHeaders(token),
  })

  return { ok: true }
}

/**
 * Lists Attio objects so the UI can mirror the destination schema.
 * Maps Attio's API response format to our internal format.
 */
export async function listAttioObjects(token: string) {
  logger.info("Fetching Attio objects")

  const url = `${ATTIO_API_BASE}/objects`
  const response = await fetchJson<AttioListResponse<AttioObjectRaw>>(url, {
    headers: attioHeaders(token),
  })

  logger.info("Attio objects response", {
    count: response.data.length,
    sample: response.data[0]
  })

  // Map Attio's response format to our internal format
  const mappedObjects: AttioObject[] = response.data.map((obj) => ({
    id: obj.id.object_id,
    object_name: obj.api_slug,
    label: obj.singular_noun,
    // Fields are not included in the list endpoint, only in the detail endpoint
    fields: undefined,
  }))

  return mappedObjects
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
 * Uses the query endpoint which requires POST with a body.
 */
export async function sampleAttioRecords(
  token: string,
  objectName: string,
  limit = DEFAULT_SAMPLE_LIMIT
) {
  logger.info("Fetching Attio record sample", { objectName, limit })

  const url = `${ATTIO_API_BASE}/objects/${objectName}/records/query`
  const response = await fetchJson<AttioRecordResponse>(url, {
    method: "POST",
    headers: attioHeaders(token),
    body: JSON.stringify({
      limit,
      sorts: [{ attribute: "created_at", direction: "desc" }],
    }),
  })

  logger.info("Attio sample response", {
    hasData: !!response.data,
    recordCount: response.data.length,
    firstRecordKeys: response.data[0] ? Object.keys(response.data[0]).slice(0, 5) : []
  })

  return response.data
}






