import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"

import type { ParsedHost } from "@/lib/utils"

// The build-time tldts breakdown that generate-env (auth target) writes to repo-root .generated/, parsed and spread over a null-host fallback (a renamed tldts field falls back to null), then inlined via define so no Public Suffix List ships. Anchored to this file, not cwd, so a stray tsdown run still resolves it.
const generatedPath = resolve(import.meta.dirname, "../../.generated/auth-env.json")
const fallback: ParsedHost = {
  domain: null,
  isIp: false,
  isPrivate: null,
  publicSuffix: null,
  subdomain: null,
}

let breakdown: ParsedHost = fallback
if (existsSync(generatedPath)) {
  breakdown = { ...fallback, ...JSON.parse(readFileSync(generatedPath, "utf-8")) }
} else if (process.env.SKIP_ENV_VALIDATION === "true") {
  // Only the skip-validation flow (worktree pre-commit, bare tsdown) tolerates a missing artifact; it bakes host-only cookies.
  console.warn(`@packages/auth: ${generatedPath} missing; baking the host-only fallback.`)
} else {
  throw new Error(
    `@packages/auth: ${generatedPath} missing; run generate-env auth before tsdown (or set SKIP_ENV_VALIDATION).`,
  )
}

export default definePackageConfig({
  name: "@packages/auth",
  env,
  getSafeEnv,
  define: { __DERIVED_TLDTS__: JSON.stringify(breakdown) },
})
