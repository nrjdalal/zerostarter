import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/db"

export default definePackageConfig({
  name: "@packages/db",
  env,
  getSafeEnv,
  deps: { neverBundle: ["bun"] },
})
