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
  id: z.string().meta({ example: "user_abc123" }),
  name: z.string().meta({ example: "John Doe" }),
  email: z.string().meta({ example: "john@example.com" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
})

const memberSchema = z.object({
  id: z.string().meta({ example: "member_abc123" }),
  organizationId: z.string().meta({ example: "org_abc123" }),
  userId: z.string().meta({ example: "user_abc123" }),
  role: z.string().meta({ example: "owner" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
  user: memberUserSchema,
})

const teamSchema = z.object({
  id: z.string().meta({ example: "team_abc123" }),
  name: z.string().meta({ example: "Engineering" }),
  organizationId: z.string().meta({ example: "org_abc123" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
  updatedAt: z.string().meta({ format: "date-time", example: "2026-01-01T00:00:00.000Z" }),
})

const invitationSchema = z.object({
  id: z.string().meta({ example: "inv_abc123" }),
  organizationId: z.string().meta({ example: "org_abc123" }),
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

const unauthorizedSchema = z.object({
  error: z.object({
    code: z.string().meta({ example: "AUTHORIZATION_ERROR" }),
    message: z.string().meta({ example: "Unauthorized" }),
  }),
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
              schema: resolver(
                z.object({
                  data: fullOrganizationSchema.nullable(),
                }),
              ),
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: resolver(unauthorizedSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const org = await auth.api.getFullOrganization({
        headers: c.req.raw.headers,
      })

      return c.json({ data: org })
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
              schema: resolver(
                z.object({
                  data: organizationSchema,
                }),
              ),
            },
          },
        },
        409: {
          description: "Conflict - Organization with this slug already exists",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  error: z.object({
                    code: z.string().meta({ example: "ORGANIZATION_ALREADY_EXISTS" }),
                    message: z
                      .string()
                      .meta({ example: "An organization with this slug already exists" }),
                  }),
                }),
              ),
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: resolver(unauthorizedSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const body = await c.req.json()

      const data = await auth.api.createOrganization({
        headers: c.req.raw.headers,
        body: {
          name: body.name,
          slug: body.slug,
        },
      })

      if (!data) {
        return c.json(
          {
            error: {
              code: "ORGANIZATION_ALREADY_EXISTS",
              message: "An organization with this slug already exists",
            },
          },
          409,
        )
      }

      return c.json({ data }, 201)
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
  json: { organizationId: "org_abc123" }
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
              schema: resolver(
                z.object({
                  data: fullOrganizationSchema,
                }),
              ),
            },
          },
        },
        403: {
          description: "Forbidden - User is not a member of this organization",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  error: z.object({
                    code: z.string().meta({ example: "NOT_A_MEMBER" }),
                    message: z
                      .string()
                      .meta({ example: "You are not a member of this organization" }),
                  }),
                }),
              ),
            },
          },
        },
        404: {
          description: "Not Found - Organization does not exist",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  error: z.object({
                    code: z.string().meta({ example: "ORGANIZATION_NOT_FOUND" }),
                    message: z.string().meta({ example: "Organization not found" }),
                  }),
                }),
              ),
            },
          },
        },
        401: {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: resolver(unauthorizedSchema),
            },
          },
        },
      },
    }),
    async (c) => {
      const body = await c.req.json()

      const org = await auth.api.setActiveOrganization({
        headers: c.req.raw.headers,
        body: {
          organizationId: body.organizationId,
        },
      })

      if (!org) {
        return c.json(
          {
            error: {
              code: "ORGANIZATION_NOT_FOUND",
              message: "Organization not found",
            },
          },
          404,
        )
      }

      return c.json({ data: org })
    },
  )
