import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"

export default definePackageConfig({
  name: "@packages/auth",
  env,
  getSafeEnv,
  entry: ["src/index.ts", "src/deploy.ts", "src/handoff.ts"],
})
