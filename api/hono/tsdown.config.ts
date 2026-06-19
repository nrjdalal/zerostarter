import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/api-hono"

export default definePackageConfig({
  name: "@api/hono",
  env,
  getSafeEnv,
  deps: { alwaysBundle: [/^@packages\//], neverBundle: ["bun"] },
})
