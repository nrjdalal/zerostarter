import { z } from "zod"

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
