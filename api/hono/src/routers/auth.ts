import { auth, enabledProviders } from "@packages/auth"
import { Hono } from "hono"

import { agentSignInEnabled } from "@/lib/agent-signin"

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .get("/providers", (c) =>
    c.json({
      data: {
        providers: [...enabledProviders, ...(agentSignInEnabled() ? ["agent" as const] : [])],
      },
    }),
  )
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
