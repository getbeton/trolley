export const ALLOWED_RETURN_DOMAINS = [
  "trolley.getbeton.ai",
  "auth.getbeton.ai",
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
