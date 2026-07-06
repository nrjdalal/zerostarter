import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"

// `env` and `getSafeEnv` are passed only to keep these imports in the tsconfig program (auth's tsconfig includes this file). Better-auth's inferred `auth` type references a zod internal, and the zod re-exported through `@packages/env` is what keeps that reference nameable so tsgo can emit the dts. `env` is lazy, so importing it here does not validate at build time.
export default definePackageConfig({ env, getSafeEnv })
