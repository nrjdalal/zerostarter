const skip = process.env.SKIP_ENV_VALIDATION === "true"

// A frontend build compiles the server packages but never uses their vars, so under SKIP_ENV_VALIDATION a missing server var falls back to a valid dummy and validation still passes. The real backend runs without the flag, so its vars stay required.
export const polyfill = (value: string | undefined, dummy: string) =>
  value ?? (skip ? dummy : undefined)
