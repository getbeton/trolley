/**
 * @deprecated This file is kept for backward compatibility.
 * Use createDataClient() for data operations or createAuthClient() for auth operations.
 *
 * Current behavior: Points to data client (app-specific database queries)
 */
export { createDataClient as createClient } from "./data-client"
