import { Hono } from "hono"

import { authMiddleware, Env } from "@/middlewares/auth"

const app = new Hono<Env>()

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
