import { sValidator } from "@hono/standard-validator"
import { db, waitlist } from "@packages/db"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { ApiError, validationErrorResponses } from "@/lib/error"
import { requireFeature } from "@/middlewares"

const joinSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).meta({ example: "you@example.com" }),
  // honeypot: humans never see it, bots fill it ("subject" dodges browser autofill)
  subject: z.string().optional(),
})

// social proof: surface the count only once it's real (>= COUNT_MIN), rounded down in COUNT_STEP; below that return 0 so the client hides the badge (no fabricated numbers).
const COUNT_MIN = 10
const COUNT_STEP = 5

export const waitlistRouter = new Hono()
  // 404 both endpoints when the waitlist feature is off; the router stays mounted so a fork can flip the flag on later.
  .use("*", requireFeature("waitlist"))
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
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.waitlist.$get())`,
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
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.waitlist.$post({ json: { email: "you@example.com" } }))`,
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
        ...validationErrorResponses,
      },
    }),
    // validation failures throw so onError shapes the 400 in one place
    sValidator("json", joinSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid email address", {
          issues: result.error,
        })
      }
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
