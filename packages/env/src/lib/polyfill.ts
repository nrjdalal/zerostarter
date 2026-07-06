const base = process.env.SKIP_ENV_VALIDATION === "true"
const skipServer = base || process.env.SKIP_ENV_VALIDATION_SERVER === "true"

// Under a skip flag a missing required var falls back to a shape-valid dummy so a build that lacks it still passes validation; without the flag it stays undefined and fails. Server vars skip under the base flag or the server-scoped one (a web build sets the latter, having no server secrets); client vars skip only under the base flag, so a web build still validates the public vars it inlines and ships.
export const polyfillServer = (value: string | undefined, dummy: string) =>
  value ?? (skipServer ? dummy : undefined)

export const polyfillClient = (value: string | undefined, dummy: string) =>
  value ?? (base ? dummy : undefined)
