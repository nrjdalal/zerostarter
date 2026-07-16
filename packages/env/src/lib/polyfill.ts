import { z } from "zod"

const base = process.env.SKIP_ENV_VALIDATION === "true"
const skipServer = base || process.env.SKIP_ENV_VALIDATION_SERVER === "true"

// Under a skip flag a missing or blank required var falls back to a shape-valid dummy so a build that lacks it still passes validation; without the flag it is left as-is and fails. Uses `||` so an empty string counts as absent, matching `emptyStringAsUndefined`. Server vars skip under the base flag or the server-scoped one (a web build sets the latter, having no server secrets); client vars skip only under the base flag, so a web build still validates the public vars it inlines and ships.
export const polyfillServer = (value: string | undefined, dummy: string) =>
  value || (skipServer ? dummy : value)

export const polyfillClient = (value: string | undefined, dummy: string) =>
  value || (base ? dummy : value)

// Opt-in only: a project's own url var is required by default, so a deploy that forgets it fails validation loudly (fail first). Setting VERCEL_URL_FALLBACK=true fills a MISSING value from VERCEL_BRANCH_URL (the branch-stable Vercel origin) instead, letting a preview skip per-branch config; scope the flag to preview in the dashboard so production still fails loud. An explicit url always wins, so this only ever fills a genuinely absent one. VERCEL_URL itself is unused: it changes per deployment and would bust the turbo cache. Cross-references to the sibling app are separate projects and stay explicit.
export const vercelSelfOrigin = () => {
  if (process.env.VERCEL_URL_FALLBACK !== "true") return undefined
  const host = process.env.VERCEL_BRANCH_URL
  return host ? `https://${host}` : undefined
}

// A security-critical server secret, never substituted with a dummy (unlike polyfillServer). Under a server skip flag its schema becomes optional so a tooling build passes without the secret; otherwise it stays required, so a missing secret fails closed at runtime instead of silently using a predictable constant. Pair with a raw `process.env` value in runtimeEnv (no polyfill).
export const serverSecret = <T extends z.ZodTypeAny>(schema: T) =>
  skipServer ? schema.optional() : schema
