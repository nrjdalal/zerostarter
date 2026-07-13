import { auth, enabledProviders } from "@packages/auth"
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"

// Advertise the agent sign-in under the exact condition that mounts its route (see agents.ts), so the UI button never drifts from the route it posts to: local env with AGENT_AUTH_SECRET set.
const agentEnabled = isLocal(env.NODE_ENV) && Boolean(env.AGENT_AUTH_SECRET)

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .get("/providers", (c) =>
    c.json({
      data: { providers: [...enabledProviders, ...(agentEnabled ? ["agent" as const] : [])] },
    }),
  )
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
