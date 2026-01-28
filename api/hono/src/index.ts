import { BUILD_VERSION, isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { requestId } from "hono/request-id"
import { z } from "zod"

import { metadataMiddleware, rateLimiterMiddleware } from "@/middlewares"
import { authRouter, v1Router } from "@/routers"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: env.HONO_TRUSTED_ORIGINS,
    allowHeaders: ["content-type", "authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["content-length"],
    maxAge: 600,
    credentials: true,
  }),
  metadataMiddleware,
  logger(),
  rateLimiterMiddleware,
  requestId(),
)

const routes = app
  .get("/", (c) => {
    return c.json({
      message: "ok",
      version: BUILD_VERSION,
      environment: env.NODE_ENV,
    })
  })
  .get("/headers", (c) => {
    return env.NODE_ENV === "local" || env.NODE_ENV === "development"
      ? c.json(c.req.header())
      : c.json({ error: { code: "FORBIDDEN", message: "Not allowed in production" } }, 403)
  })
  .basePath("/api")
  .get(
    "/health",
    describeRoute({
      tags: ["System"],
      description: "Get the system health",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.health.$get()
const data = await response.json()`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  environment: z
                    .enum(["local", "development", "test", "staging", "production"])
                    .meta({ example: env.NODE_ENV }),
                  message: z.string().meta({ example: "ok" }),
                  version: z.string().meta({ example: BUILD_VERSION }),
                }),
              ),
            },
          },
        },
      },
    }),
    (c) => {
      return c.json({
        message: "ok",
        version: BUILD_VERSION,
        environment: env.NODE_ENV,
      })
    },
  )
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
  .get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          version: BUILD_VERSION,
          title: "ZeroStarter",
          description: `API Reference for your ZeroStarter Instance.
- [Dashboard](/dashboard) - Client-side dashboard application
- [Better Auth Instance](/api/auth/reference) - Better Auth API reference
- [hono/client](/docs/getting-started/type-safe-api) - Type-safe API client for frontend`,
        },
      },
    }),
  )
  .get(
    "/docs",
    Scalar({
      pageTitle: "API Reference | ZeroStarter",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "hono/client",
      },
      defaultOpenAllTags: true,
      expandAllResponses: true,
      url: "/api/openapi.json",
    }),
  )

export type AppType = typeof routes

export default {
  port: env.HONO_PORT,
  fetch: app.fetch,
}
