import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"

export default definePackageConfig({ name: "@packages/auth", env, getSafeEnv })
