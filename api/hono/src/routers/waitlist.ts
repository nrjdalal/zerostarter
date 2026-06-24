import { db, waitlist } from "@packages/db"
import { Hono } from "hono"
import { z } from "zod"

import { ok, scopeRoute, validate } from "@/lib/route"

const joinSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).meta({ example: "you@example.com" }),
  // honeypot: humans never see it, bots fill it ("subject" dodges browser autofill)
  subject: z.string().optional(),
})

// social proof: surface the count only once it's real (>= COUNT_MIN), rounded down in COUNT_STEP; below that return 0 so the client hides the badge (no fabricated numbers).
const COUNT_MIN = 10
const COUNT_STEP = 5

const route = scopeRoute({ tags: ["Waitlist"] })

export const waitlistRouter = new Hono()
  .get(
    "/",
    route({
      description:
        "Approximate waitlist count once it passes a display threshold (0 below it), rounded down in steps of 5",
      output: z.object({ count: z.number().meta({ example: 40 }) }),
    }),
    async (c) => {
      const exact = await db.$count(waitlist)
      const count = exact >= COUNT_MIN ? Math.floor(exact / COUNT_STEP) * COUNT_STEP : 0
      return ok(c, { count })
    },
  )
  .post(
    "/",
    route({
      description: "Join the waitlist",
      input: joinSchema,
      output: z.object({ message: z.string().meta({ example: "ok" }) }),
    }),
    validate(joinSchema),
    async (c) => {
      const { email, subject } = c.req.valid("json")
      // honeypot filled => silently accept without storing (bot)
      if (!subject) {
        await db
          .insert(waitlist)
          .values({ email: email.toLowerCase() })
          .onConflictDoNothing({ target: waitlist.email })
      }
      return ok(c, { message: "ok" })
    },
  )
