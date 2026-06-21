import { sValidator } from "@hono/standard-validator"
import { db, waitlist } from "@packages/db"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { jsonError } from "@/lib/error"

const joinSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).meta({ example: "you@example.com" }),
  // honeypot: humans never see it, bots fill it ("subject" dodges browser autofill)
  subject: z.string().optional(),
})

// social proof: surface the count only once it's real (>= COUNT_MIN), rounded down in COUNT_STEP; below that return 0 so the client hides the badge (no fabricated numbers).
const COUNT_MIN = 10
const COUNT_STEP = 5

export const waitlistRouter = new Hono()
  .get(
    "/",
    describeRoute({
      tags: ["Waitlist"],
      description:
        "Approximate waitlist count once it passes a display threshold (0 below it), rounded down in steps of 5",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.waitlist.$get()
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
                z.object({ data: z.object({ count: z.number().meta({ example: 40 }) }) }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const exact = await db.$count(waitlist)
      const count = exact >= COUNT_MIN ? Math.floor(exact / COUNT_STEP) * COUNT_STEP : 0
      return c.json({ data: { count } })
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["Waitlist"],
      description: "Join the waitlist",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient } from "@/lib/api/client"

const response = await apiClient.waitlist.$post({ json: { email: "you@example.com" } })
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
                z.object({ data: z.object({ message: z.string().meta({ example: "ok" }) }) }),
              ),
            },
          },
        },
      },
    }),
    sValidator("json", joinSchema, (result, c) => {
      if (!result.success) return jsonError(c, 400, "VALIDATION_ERROR", "Invalid email address")
    }),
    async (c) => {
      const { email, subject } = c.req.valid("json")
      // honeypot filled => silently accept without storing (bot)
      if (!subject) {
        await db
          .insert(waitlist)
          .values({ email: email.toLowerCase() })
          .onConflictDoNothing({ target: waitlist.email })
      }
      return c.json({ data: { message: "ok" } })
    },
  )
