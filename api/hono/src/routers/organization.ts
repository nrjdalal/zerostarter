import type { Session } from "@packages/auth"

import { auth } from "@packages/auth"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

const organizationSchema = z.object({
  id: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  name: z.string().meta({ example: "ZeroStarter Inc." }),
  slug: z.string().nullable().meta({ example: "zerostarter-dev" }),
  logo: z.string().nullable().meta({ example: null }),
  metadata: z.string().nullable().meta({ example: null }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
})

const memberUserSchema = z.object({
  id: z.string().meta({ example: "Px9wMfJEe1if5iaX0Y7PO1GZW3maAHSb" }),
  name: z.string().meta({ example: "John Doe" }),
  email: z.string().meta({ example: "john@example.com" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
})

const memberSchema = z.object({
  id: z.string().meta({ example: "W3maAHSbPx9wMfJEe1if5iaX0Y7PO1GZ" }),
  organizationId: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  userId: z.string().meta({ example: "Px9wMfJEe1if5iaX0Y7PO1GZW3maAHSb" }),
  role: z.string().meta({ example: "owner" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
  user: memberUserSchema,
})

const teamSchema = z.object({
  id: z.string().meta({ example: "Y7PO1GZW3maAHSbPx9wMfJEe1if5iaX0" }),
  name: z.string().meta({ example: "Engineering" }),
  organizationId: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
})

const invitationSchema = z.object({
  id: z.string().meta({ example: "AHSbPx9wMfJEe1if5iaX0Y7PO1GZW3ma" }),
  organizationId: z.string().meta({ example: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }),
  email: z.string().meta({ example: "invite@example.com" }),
  role: z.string().meta({ example: "member" }),
  status: z.string().meta({ example: "pending" }),
  expiresAt: z.string().meta({ format: "date-time", example: "2026-01-08T00:00:00.000Z" }),
})

const fullOrganizationSchema = organizationSchema.extend({
  invitations: z.array(invitationSchema),
  members: z.array(memberSchema),
  teams: z.array(teamSchema),
})

export const organizationRouter = new Hono<{
  Variables: Session
}>()
  .get(
    "/",
    describeRoute({
      tags: ["v1"],
      description: "Get active organization",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.organization.$get()
const { data: activeOrganization } = await response.json()`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: fullOrganizationSchema.nullable() })),
            },
          },
        },
      },
    }),
    async (c) => {
      const data = await auth.api.getFullOrganization({
        headers: c.req.raw.headers,
      })
      return c.json({ data })
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["v1"],
      description: "Create organization",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.organization.$post({
  json: { name: "Acme Inc.", slug: "acme-inc" }
})
const { data: organization } = await response.json()`,
          },
        ],
      } as object),
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: organizationSchema })),
            },
          },
        },
      },
    }),
    async (c) => {
      const data = await auth.api.createOrganization({
        headers: c.req.raw.headers,
        body: await c.req.json(),
      })
      return c.json({ data })
    },
  )
  .put(
    "/",
    describeRoute({
      tags: ["v1"],
      description: "Set active organization",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.organization.$put({
  json: { organizationId: "JEe1if5iaX0Y7PO1GZW3maAHSbPx9wMf" }
})
const { data: activeOrganization } = await response.json()`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: fullOrganizationSchema })),
            },
          },
        },
      },
    }),
    async (c) => {
      const data = await auth.api.setActiveOrganization({
        headers: c.req.raw.headers,
        body: await c.req.json(),
      })
      return c.json({ data })
    },
  )
