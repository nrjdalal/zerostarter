import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { authRouter, v1Router } from "@/routers"
import type { Session } from "@packages/auth"
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { z } from "zod"

const app = new Hono<{ Variables: Session }>().basePath("/api")

app.use(logger())

app.use(
  "/*",
  cors({
    origin: env.HONO_TRUSTED_ORIGINS,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

const routes = app
  .get("/health", (c) => {
    return c.json({ message: "OK", ...(isLocal(env.NODE_ENV) ? { env } : {}) })
  })
  .route("/auth", authRouter)
  .route("/v1", v1Router)
  .notFound((c) => c.json({ message: "Not Found" }, 404))
  .onError((error, c) => {
    console.error(error)
    if (error instanceof z.ZodError) {
      return c.json({ error: { message: "ZodError", errors: JSON.parse(error.message) } }, 400)
    }
    if (error instanceof Error) return c.json({ error: { message: error.message } }, 500)
    return c.json({ error: { message: "I'm a teapot" } }, 418)
  })

export type AppType = typeof routes

export default {
  port: 4000,
  fetch: app.fetch,
}
