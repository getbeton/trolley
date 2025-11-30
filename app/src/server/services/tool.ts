import crypto from "node:crypto"

import { logger } from "../logger"

/**
 * Placeholder validator for the internal tool token until the actual service
 * endpoint is wired up. We at least ensure consistent formatting.
 */
export async function validateToolToken(token: string) {
  logger.info("Validating tool token")

  if (token.length < 16) {
    throw new Error("Tool token must be at least 16 characters long")
  }

  return {
    ok: true,
    fingerprint: crypto.createHash("sha256").update(token).digest("hex"),
  }
}






