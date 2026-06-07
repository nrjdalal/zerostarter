import { sValidator } from "@hono/standard-validator"
import { db, waitlist } from "@packages/db"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { validationHook } from "@/lib/validation"

const joinSchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)).meta({ example: "you@example.com" }),
  // honeypot: humans never see it, bots fill it ("subject" avoids browser autofill heuristics)
  subject: z.string().optional(),
})

// display floor and rounding step, so the advertised "N+" is consistent everywhere
const COUNT_FLOOR = 10
const COUNT_STEP = 5

export const waitlistRouter = new Hono()
  .get(
    "/",
    describeRoute({
      tags: ["Waitlist"],
      description:
        "Get the approximate waitlist signup count (floored to 10, rounded down in steps of 5)",
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
                z.object({
                  data: z.object({
                    count: z.number().meta({ example: 40 }),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    async (c) => {
      const exact = await db.$count(waitlist)
      const count = Math.max(COUNT_FLOOR, Math.floor(exact / COUNT_STEP) * COUNT_STEP)
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
                z.object({
                  data: z.object({
                    message: z.string().meta({ example: "ok" }),
                  }),
                }),
              ),
            },
          },
        },
      },
    }),
    sValidator("json", joinSchema, validationHook),
    async (c) => {
      const { email, subject } = c.req.valid("json")
      if (!subject) {
        await db
          .insert(waitlist)
          .values({ email: email.toLowerCase() })
          .onConflictDoNothing({ target: waitlist.email })
      }
      return c.json({ data: { message: "ok" } })
    },
  )
