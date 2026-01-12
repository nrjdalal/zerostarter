import type { Session } from "@packages/auth"

import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { z } from "zod"

import { authRouter, v1Router } from "@/routers"

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
    return c.json({
      message: "ok",
      environment: env.NODE_ENV,
    })
  })
  .route("/auth", authRouter)
  .route("/v1", v1Router)
  .notFound((c) => {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      },
      404,
    )
  })
  .onError((error, c) => {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
            issues: error.issues,
          },
        },
        400,
      )
    }
    if (error instanceof Error) {
      return c.json(
        {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: isLocal(env.NODE_ENV) ? error.message : "An unexpected error occurred",
          },
        },
        500,
      )
    }
    return c.json(
      {
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unexpected error occurred",
        },
      },
      500,
    )
  })

export type AppType = typeof routes

export default {
  port: env.HONO_PORT,
  fetch: app.fetch,
}
