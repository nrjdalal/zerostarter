import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { authRouter, v1Router } from "@/routers"
import type { Session } from "@packages/auth"
import { env } from "@packages/env"

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
    return c.text("OK")
  })
  .route("/auth", authRouter)
  .route("/v1", v1Router)

export type AppType = typeof routes

export default {
  port: 4000,
  fetch: app.fetch,
}
