"use client"

import { ReactNode, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import superjson from "superjson"

import { api } from "@/lib/trpc/client"

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return ""
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return `http://localhost:${process.env.PORT ?? 3000}`
}

/** Wraps the application with TRPC + React Query providers. */
export function TRPCProvider({ children }: { children: ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  )

  const trpcClient = useMemo(
    () =>
        api.createClient({
          links: [
            httpBatchLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
              fetch: async (input, init?) => {
                return fetch(input, {
                  ...init,
                  credentials: "include",
                })
              },
            }),
          ],
        }),
    []
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  )
}


