import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"

import { auth } from "@packages/auth"
import type { Session } from "@packages/auth"
import { z } from "zod"

const app = new Hono<{
  Variables: Session
}>()

export const authRouter = app
  .get(
    "/get-session",
    zValidator(
      "query",
      z
        .object({
          select: z.string().optional(),
        })
        .optional(),
    ),
    async (c) => {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      })

      if (!session) return c.json(null)

      const { select } = c.req.valid("query") ?? {}

      if (!select) return c.json(session)

      const selections = select
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      if (selections.length === 1) {
        const key = selections[0]
        if (key === "session") return c.json(session.session)
        if (key === "user") return c.json(session.user)
      }

      const result: Partial<typeof session> = {}

      for (const key of selections) {
        if (key === "session") result.session = session.session
        if (key === "user") result.user = session.user
      }

      return c.json(result)
    },
  )
  .on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw))
