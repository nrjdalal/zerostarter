import { site } from "@packages/config/site"
import { getBuildVersion } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Scalar } from "@scalar/hono-api-reference"
import { Hono } from "hono"
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { logger } from "hono/logger"
import { z } from "zod"

import { errorHandler, globalErrorResponses, jsonError } from "@/lib/error"
import { rateLimiterMiddleware } from "@/middlewares"
import { agentsRouter, authRouter, v1Router, waitlistRouter } from "@/routers"

const BUILD_VERSION = getBuildVersion()

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
app.notFound((c) => jsonError(c, 404, "NOT_FOUND", "Not Found"))

const routes = app
  .get("/", (c) => {
    const data = { version: BUILD_VERSION, environment: env.NODE_ENV }
    return c.json({ data })
  })
  .get("/headers", (c) => {
    if (env.NODE_ENV !== "local" && env.NODE_ENV !== "development") {
      throw new HTTPException(403, { message: "Forbidden" })
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
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.health.$get())`,
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
  .route("/agents", agentsRouter)
  .route("/auth", authRouter)
  .route("/v1", v1Router)
  .route("/waitlist", waitlistRouter)
  .get(
    "/openapi.json",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          version: BUILD_VERSION,
          title: site.name,
          description: site.apiReferenceDescription,
        },
      },
      // Always-reachable errors (429/500) on every GET/POST; routes add 400/401 in their own responses. Add PUT/DELETE here if such routes appear.
      defaultOptions: {
        GET: { responses: globalErrorResponses },
        POST: { responses: globalErrorResponses },
      },
    }),
  )
  .get(
    "/docs",
    Scalar({
      pageTitle: `API Reference | ${site.name}`,
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
export type { ErrorCode } from "@/lib/error"

export default {
  port: env.HONO_PORT,
  fetch: app.fetch,
}
