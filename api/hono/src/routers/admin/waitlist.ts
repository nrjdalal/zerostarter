import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import { db, waitlist, waitlistRemoveSummary, type Transaction } from "@packages/db"
import { asc, ilike, inArray, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { batchInput, batchResponseSchema, uniqueIds } from "@/lib/batch"
import { deleteSet } from "@/lib/batch-write"
import {
  ApiError,
  authErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { codeSample } from "@/lib/openapi"
import { countedTotal, paging, pagingFields } from "@/lib/paging"
import { escapeLike } from "@/lib/sql"
import { requireFeature } from "@/middlewares"
import { listQueryShape } from "@/routers/admin/shared"

const waitlistSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  email: z.string().meta({ format: "email", example: "ada@example.com" }),
  id: z.string().meta({ example: "b81d5e3a-92c4-4f17-8ad6-1e70c3f92a4b" }),
})

// One tuple feeds the enum and the column map, so a sortable column cannot exist in one and not the other.
const WAITLIST_SORTS = ["createdAt", "email"] as const

const waitlistQuerySchema = z.object({
  ...listQueryShape,
  sort: z.enum(WAITLIST_SORTS).default("createdAt"),
})

// Both columns are NOT NULL, which is why the order below does not spell out NULLS LAST the way the users and allowlist lists do: there are no nulls to place.
const waitlistSortColumns = {
  createdAt: waitlist.createdAt,
  email: waitlist.email,
} satisfies Record<(typeof WAITLIST_SORTS)[number], unknown>

const waitlistBatchSchema = batchInput({})

export const waitlistRouter = new Hono<{
  Variables: Session
}>()
  // The waitlist is a public signup list rather than an access decision, so it sits behind its own flag: with the surface off, these routes 404 like the page and the nav entry do.
  // Both paths are listed, like the allowlist: a Hono wildcard does not match the bare segment, so the bare route needs its own line, and without the wildcard a sub-path added later would be ungated with nothing pointing at the omission.
  .use("/waitlist", requireFeature("waitlist"))
  .use("/waitlist/*", requireFeature("waitlist"))
  .get(
    "/waitlist",
    describeRoute({
      tags: ["Admin"],
      description: "Who has asked to be told when this launches, newest first.",
      ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.waitlist.$get({ query: { page: "1", perPage: "25" } }),
)`),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    signups: z.array(waitlistSchema),
                    ...pagingFields,
                  }),
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
    sValidator("query", waitlistQuerySchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const { dir, page, perPage, q, sort } = c.req.valid("query")
      const where = q ? ilike(waitlist.email, `%${escapeLike(q)}%`) : undefined

      const [rows, counted] = await Promise.all([
        db
          .select({
            createdAt: waitlist.createdAt,
            email: waitlist.email,
            id: waitlist.id,
          })
          .from(waitlist)
          .where(where)
          .orderBy(
            sql`${waitlistSortColumns[sort]} ${sql.raw(dir === "asc" ? "asc" : "desc")}`,
            asc(waitlist.id),
          )
          .limit(perPage)
          .offset((page - 1) * perPage),
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(waitlist)
          .where(where),
      ])

      const data = {
        signups: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        ...paging({ page, perPage, total: countedTotal(counted) }),
      }
      return c.json({ data })
    },
  )
  .delete(
    "/waitlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "Remove a set of signups in one transaction. A signup that is already gone comes back as its own not-found outcome rather than failing the request.",
      ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(apiClient.v1.admin.waitlist.$delete({ json: { ids } }))`),
      responses: {
        200: {
          description: "OK",
          content: { "application/json": { schema: resolver(batchResponseSchema) } },
        },
        ...validationErrorResponses,
        ...authErrorResponses,
        ...forbiddenErrorResponses,
      },
    }),
    sValidator("json", waitlistBatchSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const targets = uniqueIds(c.req.valid("json").ids)

      // Deleted in one statement, then read back to say which ids were there: the rows are gone after this, so the address only survives in the records written below.
      const results = await deleteSet({
        missing: "Signup not found",
        records: (rows) =>
          rows.map((row) => ({
            action: "waitlist.remove" as const,
            actor,
            summary: waitlistRemoveSummary(row.email),
          })),
        remove: (tx: Transaction) =>
          tx
            .delete(waitlist)
            .where(inArray(waitlist.id, targets))
            .returning({ email: waitlist.email, id: waitlist.id }),
        targets,
      })
      return c.json({ data: { results } })
    },
  )
