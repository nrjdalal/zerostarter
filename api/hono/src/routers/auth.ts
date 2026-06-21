import { auth, enabledProviders } from "@packages/auth"
import { Hono } from "hono"

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .get("/providers", (c) => c.json({ data: { providers: enabledProviders } }))
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
