import type { Session } from "@packages/auth"

import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

const sessionSchema = z.object({
  id: z.string().meta({ example: "Kx9mNpL2qRvT4yHjW8sB3cF6gD1eA0Zu" }),
  userId: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  token: z.string().meta({ example: "Qw5rTyU8iOp2AsDfGhJkLzXcVbNm4E7R" }),
  ipAddress: z.string().nullable().meta({ example: "202.9.121.21" }),
  userAgent: z.string().nullable().meta({ example: "Mozilla/5.0 Chrome/143.0.0.0 Safari/537.36" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  expiresAt: z.string().meta({ format: "date-time", example: "2026-01-28T13:06:25.712Z" }),
})

const userSchema = z.object({
  id: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  name: z.string().meta({ example: "John Doe" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
})

export const sessionRouter = new Hono<{
  Variables: Session
}>()
  .get(
    "/",
    describeRoute({
      tags: ["v1"],
      description: "Get current session",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.session.$get()
const { data: session } = await response.json()`,
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
      },
    }),
    (c) => {
      const data = c.get("session")
      return c.json({ data })
    },
  )
  .get(
    "/user",
    describeRoute({
      tags: ["v1"],
      description: "Get current user",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.session.user.$get()
const { data: user } = await response.json()`,
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
      },
    }),
    (c) => {
      const data = c.get("user")
      return c.json({ data })
    },
  )
