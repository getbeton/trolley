import { logger } from "../logger"

export interface HttpRequestOptions extends RequestInit {
  timeoutMs?: number
}

/**
 * Helper around fetch that adds timeouts and structured logging.
 */
export async function fetchJson<TResponse>(
  url: string,
  { timeoutMs = 10_000, ...init }: HttpRequestOptions = {}
): Promise<TResponse> {
  logger.debug("HTTP request starting", { url, method: init.method ?? "GET" })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      logger.warn("HTTP request failed", {
        url,
        status: response.status,
        body: text,
      })
      throw new Error(`Request to ${url} failed with status ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const text = await response.text()
      logger.warn("HTTP request returned non-JSON response", {
        url,
        contentType,
        bodyPreview: text.slice(0, 200),
      })

      const parsedUrl = new URL(url)
      if (contentType?.includes("text/html")) {
        throw new Error(
          `API endpoint ${parsedUrl.pathname} returned HTML instead of JSON. ` +
          `This usually means the endpoint doesn't exist or requires different authentication. ` +
          `Check the API base URL and endpoint path.`
        )
      }

      throw new Error(`Expected JSON from ${url}, but got ${contentType}`)
    }

    return (await response.json()) as TResponse
  } catch (error) {
    logger.error("HTTP request threw", error instanceof Error ? error : undefined)
    throw error
  } finally {
    clearTimeout(timeout)
  }
}


