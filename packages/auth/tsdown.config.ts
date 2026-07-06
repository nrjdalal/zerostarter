import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"

// Unused at build, but kept: this file is in auth's tsconfig program, and the zod re-exported through @packages/env keeps better-auth's zod-referencing `auth` type nameable so tsgo can emit its dts. `env` is lazy, so importing it does not validate.
export default definePackageConfig({ env, getSafeEnv })
