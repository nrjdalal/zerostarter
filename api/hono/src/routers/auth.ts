import { auth } from "@packages/auth"
import { Hono } from "hono"

export const authRouter = new Hono()
  .get("/get-session", (c) => auth.handler(c.req.raw))
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
