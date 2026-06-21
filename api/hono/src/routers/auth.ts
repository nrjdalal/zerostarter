import { auth, enabledSocialProviders } from "@packages/auth"
import { Hono } from "hono"

export const authRouter = new Hono()
  .get("/providers", (c) => c.json({ data: { providers: enabledSocialProviders } }))
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
