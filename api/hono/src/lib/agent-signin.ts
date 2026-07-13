import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"

// True when the local-only agent sign-in is enabled: a local env with AGENT_SIGNIN_ENABLED turned on (off by default, so a clone or a deploy mounts no admin-minting route). The route mount (agents.ts) and the /providers advertisement (auth.ts) share this predicate, so a shown button never posts to an unmounted route.
export const agentSignInEnabled = (): boolean => isLocal(env.NODE_ENV) && env.AGENT_SIGNIN_ENABLED
