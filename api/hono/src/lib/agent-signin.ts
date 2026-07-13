import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"

// One source of truth for the route mount (agents.ts) and the /providers advertisement (auth.ts).
export const agentSignInEnabled = (): boolean => isLocal(env.NODE_ENV) && env.AGENT_SIGNIN_ENABLED
