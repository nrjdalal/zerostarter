import { z } from "zod"

const base = process.env.SKIP_ENV_VALIDATION === "true"
const skipServer = base || process.env.SKIP_ENV_VALIDATION_SERVER === "true"

// Under a skip flag a missing or blank required var falls back to a shape-valid dummy so a build that lacks it still passes validation; without the flag it is left as-is and fails. Uses `||` so an empty string counts as absent, matching `emptyStringAsUndefined`. Server vars skip under the base flag or the server-scoped one (a web build sets the latter, having no server secrets); client vars skip only under the base flag, so a web build still validates the public vars it inlines and ships.
export const polyfillServer = (value: string | undefined, dummy: string) =>
  value || (skipServer ? dummy : value)

export const polyfillClient = (value: string | undefined, dummy: string) =>
  value || (base ? dummy : value)

// Opt-in only: a project's own url var is required by default, so a deploy that forgets it fails validation loudly (fail first). With VERCEL_URL_FALLBACK=true this fills a MISSING var from VERCEL_BRANCH_URL (the branch-stable Vercel origin), letting a preview skip per-branch config; scope the flag to preview so production still fails loud, and an explicit url always wins. It MUTATES process.env before createEnv (rather than a call inside runtimeEnv) so a NEXT_PUBLIC_ var resolves to a literal Next can inline into the client bundle: a function reading VERCEL_BRANCH_URL inside runtimeEnv would only run in the browser, where that var is undefined, and the client would fail validation. VERCEL_URL is unused (per-deployment, would bust the turbo cache); cross-references to the sibling app stay explicit.
export const applyVercelSelfOrigin = (name: string) => {
  if (process.env[name] || process.env.VERCEL_URL_FALLBACK !== "true") return
  const host = process.env.VERCEL_BRANCH_URL
  if (host) process.env[name] = `https://${host}`
}

// A security-critical server secret, never substituted with a dummy (unlike polyfillServer). Under a server skip flag its schema becomes optional so a tooling build passes without the secret; otherwise it stays required, so a missing secret fails closed at runtime instead of silently using a predictable constant. Pair with a raw `process.env` value in runtimeEnv (no polyfill).
export const serverSecret = <T extends z.ZodTypeAny>(schema: T) =>
  skipServer ? schema.optional() : schema
