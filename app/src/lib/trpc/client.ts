import { createTRPCReact } from "@trpc/react-query"

import type { AppRouter } from "@/server/api/root"

// Shared TRPC client that the wizard UI can consume.
export const api = createTRPCReact<AppRouter>()




