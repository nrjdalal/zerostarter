import { auth, enabledProviders } from "@packages/auth"
import { Hono } from "hono"

import { agentSignInEnabled } from "@/lib/agent-signin"
import { handleAuthWithHostCookies } from "@/lib/host-cookie"

const handleAuth = (raw: Request) => handleAuthWithHostCookies((req) => auth.handler(req), raw)

export const authRouter = new Hono()
  .get("/get-session", (c) => handleAuth(c.req.raw))
  .get("/providers", (c) =>
    c.json({
      data: {
        providers: [...enabledProviders, ...(agentSignInEnabled() ? ["agent" as const] : [])],
      },
    }),
  )
  .on(["GET", "POST"], "/*", (c) => handleAuth(c.req.raw))
