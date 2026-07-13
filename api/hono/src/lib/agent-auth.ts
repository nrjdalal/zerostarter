import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"

// The local-only agent sign-in is enabled only when a fork deliberately sets AGENT_AUTH_SECRET in a local dev env: a default clone leaves it unset, so no admin-minting route mounts even though NODE_ENV ships as local, and a production env never qualifies. The agents router gates its route on this and the auth router advertises "agent" in /providers on the same value, so the UI button never drifts from the route it posts to.
export const agentSignInEnabled = (): boolean =>
  isLocal(env.NODE_ENV) && Boolean(env.AGENT_AUTH_SECRET)
