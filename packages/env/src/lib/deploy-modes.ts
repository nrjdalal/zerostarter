// The deployment modes: decided at boot on the api (@packages/auth/deploy, from baked PSL facts) and baked as NEXT_PUBLIC_DEPLOY_MODE on the web, where this tuple validates the env value. Kept apart from lib/constants.ts, whose build-time defines make it unloadable from source.
export const DEPLOY_MODES = ["host-only", "shared", "split"] as const

export type DeployMode = (typeof DEPLOY_MODES)[number]
