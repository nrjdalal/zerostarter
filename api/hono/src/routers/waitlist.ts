import { db, waitlist } from "@packages/db"
import { Hono } from "hono"
import { z } from "zod"

import { jsonBody, jsonRoute } from "@/lib/route"
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
    jsonRoute({
      tags: ["Waitlist"],
      description:
        "Approximate waitlist count once it passes a display threshold (0 below it), rounded down in steps of 5",
      sample: "apiClient.waitlist.$get()",
      output: z.object({ count: z.number().meta({ example: 40 }) }),
    }),
    async (c) => {
      const exact = await db.$count(waitlist)
      const count = exact >= COUNT_MIN ? Math.floor(exact / COUNT_STEP) * COUNT_STEP : 0
      return c.json({ data: { count } })
    },
  )
  .post(
    "/",
    jsonRoute({
      tags: ["Waitlist"],
      description: "Join the waitlist",
      sample: `apiClient.waitlist.$post({ json: { email: "you@example.com" } })`,
      output: z.object({ message: z.string().meta({ example: "ok" }) }),
      validated: true,
    }),
    jsonBody(joinSchema, "Invalid email address"),
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
