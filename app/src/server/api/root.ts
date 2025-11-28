import { router } from "./trpc"
import { credentialRouter } from "./routers/credential"
import { entityRouter } from "./routers/entity"
import { selectionRouter } from "./routers/selection"

export const appRouter = router({
  credentials: credentialRouter,
  entities: entityRouter,
  selections: selectionRouter,
})

export type AppRouter = typeof appRouter

