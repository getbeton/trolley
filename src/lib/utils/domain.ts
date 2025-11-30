/**
 * Domain detection and URL validation utilities for multi-domain auth
 */

export function isAuthDomain(hostname: string): boolean {
  return (
    hostname === "auth.getbeton.ai" ||
    hostname === "localhost:3000" || // Dev testing
    hostname === "localhost" // Dev testing without port
  )
}

export function isTrolleyDomain(hostname: string): boolean {
  return (
    hostname === "trolley.getbeton.ai" ||
    hostname.includes("vercel.app") || // Vercel previews
    hostname === "localhost:3000" ||
    hostname === "localhost"
  )
}

export const ALLOWED_RETURN_DOMAINS = [
  "trolley.getbeton.ai",
  "enrichment.getbeton.ai",
  "facade.getbeton.ai",
] as const

export function validateReturnURL(returnURL: string): boolean {
  try {
    const url = new URL(returnURL)

    // Allow localhost for development
    if (url.hostname === "localhost") return true

    // Check against whitelist
    return ALLOWED_RETURN_DOMAINS.some(
      (domain) =>
        url.hostname === domain || url.hostname.endsWith(".vercel.app") // Vercel previews
    )
  } catch {
    return false
  }
}
