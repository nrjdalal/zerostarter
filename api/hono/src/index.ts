import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { z } from "zod"

import { errorHandler } from "@/lib/error"
import { rateLimiterMiddleware } from "@/middlewares"
import { authRouter, v1Router } from "@/routers"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: env.HONO_TRUSTED_ORIGINS,
    allowHeaders: ["content-type", "authorization"],
    allowMethods: ["GET", "OPTIONS", "POST", "PUT"],
    exposeHeaders: ["content-length"],
    maxAge: 600,
    credentials: true,
  }),
  logger(),
  rateLimiterMiddleware,
)

app.onError(errorHandler)
app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Not Found" } }, 404))

const routes = app
  .get("/", (c) => {
    const data = { version: BUILD_VERSION, environment: env.NODE_ENV }
    return c.json({ data })
  })
  .get("/headers", (c) => {
    if (env.NODE_ENV !== "local" && env.NODE_ENV !== "development") {
      return c.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, 403)
    }
    const data = c.req.header()
    return c.json({ data })
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
const { data } = await response.json()`,
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
                  data: z.object({
                    environment: z
                      .enum(["local", "development", "test", "staging", "production"])
                      .meta({ example: env.NODE_ENV }),
                    message: z.string().meta({ example: "ok" }),
                    version: z.string().meta({ example: BUILD_VERSION }),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    (c) => {
      const data = { message: "ok", version: BUILD_VERSION, environment: env.NODE_ENV }
      return c.json({ data })
    },
  )
  .route("/auth", authRouter)
  .route("/v1", v1Router)
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
