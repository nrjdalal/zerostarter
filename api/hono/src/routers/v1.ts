import { Hono } from "hono"

import { authMiddleware } from "@/middlewares"
import type { Session } from "@packages/auth"

const app = new Hono<{
  Variables: Session
}>()

app.use("/*", authMiddleware)

export const v1Router = app
  .get("/session", (c) => {
    const session = c.get("session")
    return c.json(session)
  })
  .get("/user", (c) => {
    const user = c.get("user")
    return c.json(user)
  })
