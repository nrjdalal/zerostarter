import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import { ACTIVITY_ACTIONS } from "@packages/config/console"
import { activity, db, user } from "@packages/db"
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { codeSample } from "@/lib/code-sample"
import {
  ApiError,
  authErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { countedTotal, paging, pagingFields } from "@/lib/paging"
import { escapeLike } from "@/lib/sql"
import { facetSchema, listQueryShape } from "@/routers/admin/shared"

const activitySchema = z.object({
  // The stored code, not z.enum(ACTIVITY_ACTIONS): a fork that adds a verb, or a row written before one was removed, still has to come back as what it is. The query side stays enumerated, since filtering by a verb nothing writes is a client bug.
  action: z.string().meta({ example: "role.change" }),
  actor: z.string().meta({ example: "ada@example.com" }),
  actorId: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  id: z.string().meta({ example: "9f1c2a44-7b3e-4d21-9d64-2a1b0c8e7f55" }),
  summary: z.string().meta({ example: "Changed ada@example.com from member to admin" }),
})

const activityQuerySchema = z.object({
  ...listQueryShape,
  action: facetSchema(ACTIVITY_ACTIONS),
})

export const activityRouter = new Hono<{
  Variables: Session
}>().get(
  "/activity",
  describeRoute({
    tags: ["Admin"],
    description:
      "What the console did and who did it, newest first. Append only, so the list never shows an edited row.",
    ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.activity.$get({ query: { page: "1", perPage: "25" } }),
)`),
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                data: z.object({ events: z.array(activitySchema), ...pagingFields }),
              }),
            ),
          },
        },
      },
      ...validationErrorResponses,
      ...authErrorResponses,
      ...forbiddenErrorResponses,
    },
  }),
  sValidator("query", activityQuerySchema, (result) => {
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
    }
  }),
  async (c) => {
    const { action, dir, page, perPage, q } = c.req.valid("query")
    const search = q
      ? or(
          ilike(activity.summary, `%${escapeLike(q)}%`),
          ilike(activity.actor, `%${escapeLike(q)}%`),
          ilike(user.email, `%${escapeLike(q)}%`),
        )
      : undefined
    const where = and(
      search,
      action.length ? or(...action.map((value) => eq(activity.action, value))) : undefined,
    )

    const [rows, counted] = await Promise.all([
      db
        .select({
          action: activity.action,
          // The actor's current email when the account is still there, else what was stored when they acted.
          actor: sql<string>`coalesce(${user.email}, ${activity.actor})`,
          actorId: activity.actorId,
          createdAt: activity.createdAt,
          id: activity.id,
          summary: activity.summary,
        })
        .from(activity)
        .leftJoin(user, eq(user.id, activity.actorId))
        .where(where)
        .orderBy(
          dir === "asc" ? asc(activity.createdAt) : desc(activity.createdAt),
          asc(activity.id),
        )
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(activity)
        .leftJoin(user, eq(user.id, activity.actorId))
        .where(where),
    ])

    return c.json({
      data: {
        // The action travels as it was stored. Coercing an unrecognised verb into one of ours would put a row in the trail claiming a change that never happened, and a trail that invents entries is worse than one with a code the reader has to look up. The UI falls back to the code when it has no label for it.
        events: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        ...paging({ page, perPage, total: countedTotal(counted) }),
      },
    })
  },
)
