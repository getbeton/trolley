/**
 * @deprecated This file is kept for backward compatibility.
 * Use createDataServerClient() for data operations or createAuthServerClient() for auth operations.
 *
 * Current behavior: Points to data clients (app-specific database queries)
 */
export { createDataServerClient as createClient, createDataAdminClient as createAdminClient } from "./data-server"
