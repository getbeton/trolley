import { router } from "./trpc"
import { credentialRouter } from "./routers/credential"
import { entityRouter } from "./routers/entity"
import { selectionRouter } from "./routers/selection"
import { migrationRouter } from "./routers/migration"

export const appRouter = router({
  credentials: credentialRouter,
  entities: entityRouter,
  selections: selectionRouter,
  migrations: migrationRouter,
})

export type AppRouter = typeof appRouter

