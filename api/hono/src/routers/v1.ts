import type { Session } from "@packages/auth"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { authErrorResponses } from "@/lib/error"
import { authMiddleware } from "@/middlewares"
import { adminRouter } from "@/routers/admin"

const sessionSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  expiresAt: z.string().meta({ format: "date-time", example: "2026-01-28T13:06:25.712Z" }),
  id: z.string().meta({ example: "6kpGKXeJAKfB4MERWrfdyFdKd1ZB0Czo" }),
  ipAddress: z.string().nullable().meta({ example: "202.9.121.21" }),
  token: z.string().meta({ example: "Ds8MdODZSgu57rbR8hzapFlcv6IwoIgD" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  userAgent: z.string().nullable().meta({ example: "Mozilla/5.0 Chrome/143.0.0.0 Safari/537.36" }),
  userId: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
})

const userSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  name: z.string().meta({ example: "John Doe" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
})

export const v1Router = new Hono<{
  Variables: Session
}>()
  .use("/*", authMiddleware)
  .get(
    "/session",
    describeRoute({
      tags: ["v1"],
      description: "Get current session only",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.v1.session.$get())`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: sessionSchema })),
            },
          },
        },
        ...authErrorResponses,
      },
    }),
    (c) => {
      // Named field by field rather than handed the session straight out: that object also carries the active organization, the active team and impersonatedBy, none of which this route documents, and its own key order is the row's rather than the one declared above.
      const session = c.get("session")
      const data = {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        id: session.id,
        ipAddress: session.ipAddress,
        token: session.token,
        updatedAt: session.updatedAt,
        userAgent: session.userAgent,
        userId: session.userId,
      }
      return c.json({ data })
    },
  )
  .get(
    "/user",
    describeRoute({
      tags: ["v1"],
      description: "Get current user only",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.v1.user.$get())`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: userSchema })),
            },
          },
        },
        ...authErrorResponses,
      },
    }),
    (c) => {
      // Same reason as the session above: the object carries the console's own columns, which this route does not document.
      const user = c.get("user")
      const data = {
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        name: user.name,
        updatedAt: user.updatedAt,
      }
      return c.json({ data })
    },
  )
  .route("/admin", adminRouter)
