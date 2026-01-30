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

export const organizationsRouter = new Hono<{
  Variables: Session
}>().get(
  "/",
  describeRoute({
    tags: ["v1"],
    description: "List organizations",
    ...({
      "x-codeSamples": [
        {
          lang: "typescript",
          label: "hono/client",
          source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.v1.organizations.$get()
const { data: organizations } = await response.json()`,
        },
      ],
    } as object),
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(z.object({ data: z.array(organizationSchema) })),
          },
        },
      },
    },
  }),
  async (c) => {
    const data = await auth.api.listOrganizations({
      headers: c.req.raw.headers,
    })
    return c.json({ data })
  },
)
