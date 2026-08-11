import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import { ALLOWLIST_KINDS, parseAllowlistRule } from "@packages/auth/access"
import {
  allowlist,
  allowlistAddSummary,
  allowlistRemoveSummary,
  db,
  recordActivity,
  user,
  type Transaction,
} from "@packages/db"
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { batchInput, batchResponseSchema, uniqueIds } from "@/lib/batch"
import { deleteSet } from "@/lib/batch-write"
import {
  ApiError,
  authErrorResponses,
  conflictErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { codeSample } from "@/lib/openapi"
import { countedTotal, paging, pagingFields } from "@/lib/paging"
import { escapeLike, isUniqueViolation } from "@/lib/sql"
import { requireFeature } from "@/middlewares"
import { facetSchema, listQueryShape } from "@/routers/admin/shared"

const allowlistSchema = z.object({
  actor: z.string().nullable().meta({ example: "ada@example.com" }),
  actorId: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  id: z.string().meta({ example: "3f7a1c92-0b64-4e5d-9a13-5c2f8e6d4b70" }),
  kind: z.enum(ALLOWLIST_KINDS).meta({ example: "domain" }),
  value: z.string().meta({ example: "@example.com" }),
})

// One tuple feeds the enum and the column map, so a sortable column cannot exist in one and not the other.
const ALLOWLIST_SORTS = ["actor", "createdAt", "kind", "value"] as const

const allowlistQuerySchema = z.object({
  ...listQueryShape,
  kind: facetSchema(ALLOWLIST_KINDS),
  sort: z.enum(ALLOWLIST_SORTS).default("createdAt"),
})

const allowlistSortColumns = {
  // Resolved the same way the row renders, so sorting sorts what you see. A seeded rule has neither side, which is why the order below is explicit about NULLs.
  actor: sql`coalesce(${user.email}, ${allowlist.actor})`,
  createdAt: allowlist.createdAt,
  kind: allowlist.kind,
  value: allowlist.value,
} satisfies Record<(typeof ALLOWLIST_SORTS)[number], unknown>

const allowlistBatchSchema = batchInput({})

const allowlistCreateSchema = z.object({
  value: z.string().trim().min(1).max(254),
})

const alreadyListed = (value: string) => `${value} is already on the list.`

export const allowlistRouter = new Hono<{
  Variables: Session
}>()
  // The flag reaches the routes as well as the page and the nav: with it off, a rule can grant nothing, since the sign-in hook returns on the same flag, so an API that still accepted rules would only be collecting dead rows.
  .use("/allowlist", requireFeature("allowlist"))
  .use("/allowlist/*", requireFeature("allowlist"))
  .get(
    "/allowlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "List the rules granting console access. Admin and above; an empty list grants nothing.",
      ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$get({ query: { page: "1", perPage: "10" } }),
)`),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  data: z.object({
                    rules: z.array(allowlistSchema),
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
    sValidator("query", allowlistQuerySchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const { dir, kind, page, perPage, q, sort } = c.req.valid("query")
      const conditions = [
        q
          ? or(ilike(allowlist.value, `%${escapeLike(q)}%`), ilike(user.name, `%${escapeLike(q)}%`))
          : undefined,
        kind.length ? or(...kind.map((value) => eq(allowlist.kind, value))) : undefined,
      ].filter((condition) => condition !== undefined)
      const where = conditions.length ? and(...conditions) : undefined

      const [rows, counted] = await Promise.all([
        db
          .select({
            // The author's current email when the account is still there, else the email stored when the rule was added. Null only for a rule nobody created.
            actor: sql<string | null>`coalesce(${user.email}, ${allowlist.actor})`,
            actorId: allowlist.actorId,
            createdAt: allowlist.createdAt,
            id: allowlist.id,
            kind: allowlist.kind,
            value: allowlist.value,
          })
          .from(allowlist)
          .leftJoin(user, eq(user.id, allowlist.actorId))
          .where(where)
          // NULLS LAST spelled out, because Postgres defaults to NULLS FIRST on DESC, which would put the rules nobody is named for at the top of a Z-to-A sort.
          .orderBy(
            sql`${allowlistSortColumns[sort]} ${sql.raw(dir === "asc" ? "asc" : "desc")} nulls last`,
            asc(allowlist.id),
          )
          .limit(perPage)
          .offset((page - 1) * perPage),
        // Counted over the same join, not db.$count: the search reaches the author's name, which only exists once user is joined.
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(allowlist)
          .leftJoin(user, eq(user.id, allowlist.actorId))
          .where(where),
      ])

      const data = {
        rules: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          kind: row.kind === "email" ? ("email" as const) : ("domain" as const),
        })),
        ...paging({ page, perPage, total: countedTotal(counted) }),
      }
      return c.json({ data })
    },
  )
  .post(
    "/allowlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "Add a rule granting console access. A leading @ makes it a domain rule, anything else must parse as an address; both are normalized lowercase.",
      ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$post({ json: { value: "@example.com" } }),
)`),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.object({ rule: allowlistSchema }) })),
            },
          },
        },
        ...validationErrorResponses,
        ...authErrorResponses,
        ...forbiddenErrorResponses,
        ...conflictErrorResponses,
      },
    }),
    sValidator("json", allowlistCreateSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const rule = parseAllowlistRule(c.req.valid("json").value)
      if (!rule) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Enter a domain like @example.com or a full email address.",
        )
      }
      const [existing] = await db
        .select({ id: allowlist.id })
        .from(allowlist)
        .where(eq(allowlist.value, rule.value))
        .limit(1)
      if (existing) {
        throw new ApiError(409, "CONFLICT", alreadyListed(rule.value))
      }
      // The check above races another admin adding the same rule, so the constraint is the authority and its violation is translated rather than surfacing as a 500.
      const actor = c.get("user")
      let created
      try {
        created = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(allowlist)
            .values({ actor: actor.email, actorId: actor.id, value: rule.value })
            .returning()
          if (!row) return undefined
          await recordActivity(tx, {
            action: "allowlist.add",
            actor,
            summary: allowlistAddSummary(row.value),
          })
          return row
        })
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiError(409, "CONFLICT", alreadyListed(rule.value))
        }
        throw error
      }
      if (!created) {
        // Not a duplicate: the insert above either returns its row, throws, or the constraint path caught it. Reporting this as a conflict would name a cause that cannot be the cause.
        throw new ApiError(500, "INTERNAL_SERVER_ERROR", "The rule could not be saved.")
      }
      return c.json({
        data: {
          // Built key by key: the inserted row arrives in the table's column order, and a spread would carry that order into the reply, since re-assigning a key afterwards changes its value and not its position. Every other mapper here spreads safely only because its own select lists columns A to Z.
          rule: {
            actor: actor.email,
            actorId: created.actorId,
            createdAt: created.createdAt.toISOString(),
            id: created.id,
            // Narrowed the way the GET narrows it: kind is a text column in the row type, and the declared schema says the union.
            kind: created.kind === "email" ? ("email" as const) : ("domain" as const),
            value: created.value,
          },
        },
      })
    },
  )
  .delete(
    "/allowlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "Remove a set of rules in one transaction. A rule that is already gone comes back as its own not-found outcome rather than failing the request.",
      ...codeSample(`import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$delete({ json: { ids } }),
)`),
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
    sValidator("json", allowlistBatchSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const targets = uniqueIds(c.req.valid("json").ids)

      // Deleted in one statement, then read back to say which ids were actually there: the rows are gone after this, so their values only survive in the records written below.
      const results = await deleteSet({
        missing: "Rule not found",
        records: (rows) =>
          rows.map((row) => ({
            action: "allowlist.remove" as const,
            actor,
            summary: allowlistRemoveSummary(row.value),
          })),
        remove: (tx: Transaction) =>
          tx
            .delete(allowlist)
            .where(inArray(allowlist.id, targets))
            .returning({ id: allowlist.id, value: allowlist.value }),
        targets,
      })
      return c.json({ data: { results } })
    },
  )
