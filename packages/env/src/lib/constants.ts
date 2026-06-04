import { z } from "zod"

// Version info - injected at build time via tsdown define
declare const __VERSION__: string
declare const __GIT_SHA__: string
declare const __BUILD_VERSION__: string

export const VERSION = __VERSION__
export const GIT_SHA = __GIT_SHA__
export const BUILD_VERSION = __BUILD_VERSION__

// Baked __GIT_SHA__ freezes at the last source-changing build under turbo cache
// replays; prefer the platform's deploy-time sha when one exists (#428)
export const getBuildVersion = (): string => {
  const sha =
    typeof process === "undefined"
      ? ""
      : (process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GIT_SHA ?? "")
  return sha ? `${VERSION}-${sha}` : BUILD_VERSION
}

export const NODE_ENV = z.enum(["local", "development", "test", "staging", "production"])

export type NodeEnv = z.infer<typeof NODE_ENV>

const createEnvChecker =
  (env: NodeEnv) =>
  (nodeEnv: string | undefined): boolean => {
    return nodeEnv === env
  }

export const isLocal = createEnvChecker("local")
export const isDevelopment = createEnvChecker("development")
export const isTest = createEnvChecker("test")
export const isStaging = createEnvChecker("staging")
export const isProduction = createEnvChecker("production")
