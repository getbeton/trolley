import { router } from "./trpc"
import { credentialRouter } from "./routers/credential"
import { entityRouter } from "./routers/entity"
import { migrationRouter } from "./routers/migration"

export const appRouter = router({
  credentials: credentialRouter,
  entities: entityRouter,
  migrations: migrationRouter,
})

export type AppRouter = typeof appRouter

