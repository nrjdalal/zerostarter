import { auth, enabledProviders } from "@packages/auth"
import { Hono } from "hono"

import { ok } from "@/lib/route"

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .get("/providers", (c) => ok(c, { providers: enabledProviders }))
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
