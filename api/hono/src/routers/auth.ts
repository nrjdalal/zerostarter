import { auth, enabledSocialProviders, magicLinkEnabled } from "@packages/auth"
import { Hono } from "hono"

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .get("/providers", (c) =>
    c.json({ data: { providers: enabledSocialProviders, magicLink: magicLinkEnabled } }),
  )
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
