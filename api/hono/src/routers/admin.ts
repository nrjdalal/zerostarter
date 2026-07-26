import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import type { BanRefusal, RoleChangeRefusal } from "@packages/auth/access"
import {
  ALLOWLIST_KINDS,
  CONSOLE_ROLES,
  consoleRole,
  parseAllowlistRule,
  refuseBan,
  refuseRoleChange,
} from "@packages/auth/access"
import { ACTIVITY_ACTIONS } from "@packages/config/console"
import {
  activity,
  allowlist,
  allowlistAddSummary,
  allowlistRemoveSummary,
  banSummary,
  db,
  recordActivity,
  roleChangeSummary,
  session,
  unbanSummary,
  user,
  type ActivityEvent,
} from "@packages/db"
import { and, asc, desc, eq, ilike, inArray, isNull, notInArray, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import {
  answerFor,
  batchInput,
  batchResponseSchema,
  raced,
  refused,
  uniqueIds,
  type BatchOutcome,
} from "@/lib/batch"
import {
  ApiError,
  authErrorResponses,
  conflictErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { countedTotal, paging, pagingFields } from "@/lib/paging"
import { escapeLike, isUniqueViolation } from "@/lib/sql"
import { consoleAdminMiddleware, requireFeature } from "@/middlewares"

// What every list endpoint here takes, so a cap stated once cannot drift between two routes. Each route adds its own sort enum and facets.
const listQueryShape = {
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
}

// A comma-separated facet, deduped and held to the values the endpoint accepts, so a hand-written query degrades to unfiltered rather than 400ing the table.
const facetSchema = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(values)).max(values.length))

// Single source for the sortable columns: the schema enum and the column map both derive from it.
const SORTS = ["banned", "createdAt", "email", "lastActive", "name", "role"] as const

const usersQuerySchema = z.object({
  ...listQueryShape,
  role: facetSchema(CONSOLE_ROLES),
  sort: z.enum(SORTS).default("createdAt"),
})

// Refusals reach the user, so each says what to do rather than that something was forbidden.
const ROLE_CHANGE_MESSAGES: Record<RoleChangeRefusal, string> = {
  "last-owner": "This is the last owner. Promote someone else to owner first.",
  outranked: "You can only change people below your own role.",
  "owner-only": "Only an owner can make someone an owner.",
  self: "You cannot change your own role.",
  "unknown-role": "That is not a console role.",
}

const BAN_MESSAGES: Record<BanRefusal, string> = {
  outranked: "You can only ban people below your own role.",
  self: "You cannot ban yourself.",
}

const allowlistSchema = z.object({
  actor: z.string().nullable().meta({ example: "ada@example.com" }),
  actorId: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  kind: z.enum(ALLOWLIST_KINDS).meta({ example: "domain" }),
  value: z.string().meta({ example: "@example.com" }),
})

// Last activity is the newest session touch per person, grouped once and joined rather than correlated per row. A ban deletes their sessions and a sign-out removes one, so plenty of people have none, which is why the list's order is explicit about NULLs.
// Built at module scope so the sort map below can name the column instead of quoting the alias: renaming it is then a type error rather than a query that sorts by nothing.
const lastActiveByUser = db
  .select({
    lastActive: sql<Date | null>`max(${session.updatedAt})`.as("last_active"),
    userId: session.userId,
  })
  .from(session)
  .groupBy(session.userId)
  .as("last_active_by_user")

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

const activitySchema = z.object({
  // The stored code, not z.enum(ACTIVITY_ACTIONS): a fork that adds a verb, or a row written before one was removed, still has to come back as what it is. The query side stays enumerated, since filtering by a verb nothing writes is a client bug.
  action: z.string().meta({ example: "role.change" }),
  actor: z.string().meta({ example: "ada@example.com" }),
  actorId: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  id: z.string().meta({ example: "9f1c2a44-7b3e-4d21-9d64-2a1b0c8e7f55" }),
  summary: z.string().meta({ example: "Changed ada@example.com from member to admin" }),
})

const allowlistBatchSchema = batchInput({})

const roleBatchSchema = batchInput({ role: z.enum(CONSOLE_ROLES) })

const statusBatchSchema = batchInput({ banned: z.boolean() })

const activityQuerySchema = z.object({
  ...listQueryShape,
  action: facetSchema(ACTIVITY_ACTIONS),
})

const allowlistCreateSchema = z.object({
  value: z.string().trim().min(1).max(254),
})

// What a set route reads back from a write: the email, to word the record of what happened. A set answers with outcomes rather than rows, so returning the documented user shape would be breadth nothing consumes.
const WRITTEN_ROW = { email: user.email }

const alreadyListed = (value: string) => `${value} is already on the list.`

const asUserResponse = (row: {
  banned: boolean | null
  createdAt: Date
  email: string
  emailVerified: boolean
  id: string
  image: string | null
  lastActive?: Date | null
  name: string
  role: string | null
}) => ({
  ...row,
  banned: row.banned ? true : false,
  createdAt: row.createdAt.toISOString(),
  // Absent when the caller never asked for it, null only when the account genuinely has no session.
  ...(row.lastActive === undefined
    ? {}
    : { lastActive: row.lastActive ? row.lastActive.toISOString() : null }),
  role: consoleRole(row.role),
})

const userSchema = z.object({
  banned: z.boolean().meta({ example: false }),
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  // Optional rather than nullable-and-always-present: only the list joins the sessions subquery for it, so a reader that does not ask for it gets no key rather than a null asserting never-seen.
  lastActive: z
    .string()
    .nullable()
    .optional()
    .meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  name: z.string().meta({ example: "John Doe" }),
  role: z.enum(CONSOLE_ROLES).meta({ example: "user" }),
})

const sortColumns = {
  // status sorts by the backing flag; null means never banned
  banned: sql`coalesce(${user.banned}, false)`,
  createdAt: user.createdAt,
  email: user.email,
  lastActive: lastActiveByUser.lastActive,
  name: user.name,
  // By rank, not alphabetically: the whole point of the ladder is that it is an ordering, so owner leads and user trails. Derived from CONSOLE_ROLES, and an unrecognized value scores with the rung it displays as.
  role: sql.raw(
    `case "user"."role" ${CONSOLE_ROLES.map((role, index) => `when '${role}' then ${index}`).join(" ")} else ${CONSOLE_ROLES.length - 1} end`,
  ),
} satisfies Record<(typeof SORTS)[number], unknown>

// Console endpoints, mounted under /v1 behind authMiddleware; the console gate layers the fresh rank check on top. Everything here serves the Access section, which is an admin concern, so the whole router requires admin rather than the console's lower rung.
export const adminRouter = new Hono<{
  Variables: Session
}>()
  .use("/*", consoleAdminMiddleware)
  .get(
    "/users",
    describeRoute({
      tags: ["Admin"],
      description:
        "List users with server-driven pagination, sorting, search (name or email), and role filtering (admin only)",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.users.$get({ query: { page: "1", perPage: "10" } }),
)`,
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
                    users: z.array(userSchema),
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
    sValidator("query", usersQuerySchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const { dir, page, perPage, q, role, sort } = c.req.valid("query")

      const search = q
        ? or(ilike(user.name, `%${escapeLike(q)}%`), ilike(user.email, `%${escapeLike(q)}%`))
        : undefined
      // An unanchored ILIKE across two columns scans sequentially, on every batch as well as the count below; pg_trgm indexes are the fix once a table is large enough to feel it.
      // "user" collects null and anything unrecognized as well, because that is the rung consoleRole displays them as; otherwise a legacy value would render as user and be reachable from no filter.
      const roleConditions = role.map((value) =>
        value === "user"
          ? or(
              isNull(user.role),
              notInArray(
                user.role,
                CONSOLE_ROLES.filter((rung) => rung !== "user"),
              ),
            )
          : eq(user.role, value),
      )
      const where = and(search, roleConditions.length ? or(...roleConditions) : undefined)

      const [rows, total] = await Promise.all([
        db
          .select({
            banned: user.banned,
            createdAt: user.createdAt,
            email: user.email,
            emailVerified: user.emailVerified,
            id: user.id,
            image: user.image,
            lastActive: lastActiveByUser.lastActive,
            name: user.name,
            role: user.role,
          })
          .from(user)
          .leftJoin(lastActiveByUser, eq(lastActiveByUser.userId, user.id))
          .where(where)
          .orderBy(
            sql`${sortColumns[sort]} ${sql.raw(dir === "asc" ? "asc" : "desc")} nulls last`,
            asc(user.id),
          )
          .limit(perPage)
          .offset((page - 1) * perPage),
        // Runs per batch, cheap at starter scale; for large tables return it only on page 1 or back the ILIKE with a pg_trgm index.
        db.$count(user, where),
      ])

      const data = {
        users: rows.map(asUserResponse),
        ...paging({ page, perPage, total }),
      }
      return c.json({ data })
    },
  )
  .patch(
    "/users/role",
    describeRoute({
      tags: ["Admin"],
      description:
        "Set the role on a set of accounts. Guards run per account, so some can change while others are refused; every id comes back with its own outcome.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.users.role.$patch({ json: { ids, role: "member" } }),
)`,
          },
        ],
      } as object),
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
    sValidator("json", roleBatchSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const { ids, role: nextRole } = c.req.valid("json")
      const targets = uniqueIds(ids)

      const results = await db.transaction(async (tx) => {
        const rows = await tx.select().from(user).where(inArray(user.id, targets))
        const byId = new Map(rows.map((row) => [row.id, row]))
        // Counted once under the lock, then kept in step as the loop demotes. The single-row route can ask "is this the last owner" per request and be right; a batch holding two of the three owners would otherwise pass both guards on the same stale count and leave the install with none.
        let owners = rows.some((row) => row.role === "owner")
          ? (
              await tx
                .select({ id: user.id })
                .from(user)
                .where(eq(user.role, "owner"))
                .for("update")
            ).length
          : 0

        const outcomes = new Map<string, BatchOutcome>()
        const records: ActivityEvent[] = []
        // Written in id order, answered in the order asked. Two admins acting on overlapping selections take the same row locks in the same sequence, so they queue instead of deadlocking.
        for (const id of [...targets].sort()) {
          const target = byId.get(id)
          if (!target) {
            outcomes.set(id, refused(id, "NOT_FOUND", "User not found"))
            continue
          }
          const refusal = refuseRoleChange({
            actorRole: actor.role,
            isSelf: actor.id === target.id,
            nextRole,
            targetIsLastOwner: target.role === "owner" && owners <= 1,
            targetRole: target.role,
          })
          if (refusal) {
            outcomes.set(id, refused(id, "FORBIDDEN", ROLE_CHANGE_MESSAGES[refusal]))
            continue
          }
          const [row] = await tx
            .update(user)
            // Stamped so the allowlist treats this rung as decided: without it, demoting someone a rule still matches would be undone by their next sign-in.
            .set({ role: nextRole, roleSetAt: new Date() })
            // The rung read above is part of the qual, which makes this a compare-and-set: a change landing between that read and this write means the guard weighed the wrong rank, so the write finds nothing and the row is reported as raced rather than acted on.
            .where(
              and(
                eq(user.id, id),
                target.role === null ? isNull(user.role) : eq(user.role, target.role),
              ),
            )
            .returning(WRITTEN_ROW)
          if (!row) {
            outcomes.set(id, raced(id))
            continue
          }
          if (target.role === "owner" && nextRole !== "owner") owners -= 1
          if (target.role !== "owner" && nextRole === "owner") owners += 1
          records.push({
            action: "role.change",
            actor,
            summary: roleChangeSummary(row.email, target.role, nextRole),
          })
          outcomes.set(id, { id, ok: true })
        }
        await recordActivity(tx, records)
        return answerFor(targets, outcomes)
      })
      return c.json({ data: { results } })
    },
  )
  .patch(
    "/users/status",
    describeRoute({
      tags: ["Admin"],
      description:
        "Ban or unban a set of accounts. Guards run per account, so some can change while others are refused; every id comes back with its own outcome. A ban ends that person's sessions.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.users.status.$patch({ json: { banned: true, ids } }),
)`,
          },
        ],
      } as object),
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
    sValidator("json", statusBatchSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const { banned, ids } = c.req.valid("json")
      const targets = uniqueIds(ids)

      const results = await db.transaction(async (tx) => {
        const rows = await tx.select().from(user).where(inArray(user.id, targets))
        const byId = new Map(rows.map((row) => [row.id, row]))
        // Locked whenever the set writes an owner row, not only when it bans one. An unban writes owner rows too, and a transaction that writes them without holding this lock can deadlock against one that takes it: this select acquires in scan order while the loop below takes its rows in id order, so the two orders can cross. Taking it first in every transaction that touches an owner makes "owner set, then targets ascending" a single order everything follows.
        const owners = rows.some((row) => row.role === "owner")
          ? await tx
              .select({ banned: user.banned, id: user.id })
              .from(user)
              .where(eq(user.role, "owner"))
              .for("update")
          : []
        // Owners who can still sign in, counted under the lock and kept in step as the loop bans, for the same reason the role route counts: banning two of the three in one set must not pass both guards on one stale count.
        // Unbanned only, where the role route counts every owner: a banned owner cannot sign in to grant anyone else, so they do not keep the install reachable, while a banned owner still outranks an admin.
        let active = owners.filter((owner) => !owner.banned).length

        const outcomes = new Map<string, BatchOutcome>()
        const records: {
          action: "user.ban" | "user.unban"
          actor: typeof actor
          summary: string
        }[] = []
        const swept: string[] = []
        // Written in id order, answered in the order asked, so two admins acting on overlapping selections queue on the same row locks instead of deadlocking on opposite orders.
        for (const id of [...targets].sort()) {
          const target = byId.get(id)
          if (!target) {
            outcomes.set(id, refused(id, "NOT_FOUND", "User not found"))
            continue
          }
          const refusal = refuseBan({
            actorRole: actor.role,
            isSelf: actor.id === target.id,
            targetRole: target.role,
          })
          if (refusal) {
            outcomes.set(id, refused(id, "FORBIDDEN", BAN_MESSAGES[refusal]))
            continue
          }
          if (banned && target.role === "owner" && !target.banned && active <= 1) {
            outcomes.set(
              id,
              refused(
                id,
                "FORBIDDEN",
                "This is the last owner who can still sign in. Promote someone else to owner first.",
              ),
            )
            continue
          }
          const [row] = await tx
            .update(user)
            // Both directions clear the expiry and the reason: the plugin auto-unbans once banExpires is in the past, so a ban that left a stale one would undo itself on the next session check.
            .set({ banExpires: null, banned, banReason: null })
            // The rung is the qual, so a promotion landing between the read and this write means the guard weighed the wrong rank and the row is reported as raced.
            // banned is deliberately not in the qual. Racing this row is last-write-wins, and every outcome of that is the later intent: two bans are idempotent, and a ban losing to an unban leaves the person unbanned with their sessions already swept, which is what an unban means. In the qual, a repeated ban would answer CONFLICT instead of success.
            .where(
              and(
                eq(user.id, id),
                target.role === null ? isNull(user.role) : eq(user.role, target.role),
              ),
            )
            .returning(WRITTEN_ROW)
          if (!row) {
            outcomes.set(id, raced(id))
            continue
          }
          if (banned) {
            swept.push(id)
            // target.banned comes from the read above the lock, so a ban landing in between could drift this count. It cannot matter today: the actor is refused their own account, so a signed-in owner always remains, which is the same reason the zero-owner case is unreachable at all.
            if (target.role === "owner" && !target.banned) active -= 1
          }
          records.push({
            action: banned ? "user.ban" : "user.unban",
            actor,
            summary: banned ? banSummary(row.email) : unbanSummary(row.email),
          })
          outcomes.set(id, { id, ok: true })
        }
        // A ban has to end the person's sessions, not only flag the row: the flag alone leaves them signed in everywhere until each gate happens to re-read it. Same two writes Better Auth's own banUser makes, done here because this route owns the rank rule the plugin has no notion of.
        // One sweep and one insert for the whole set, rather than two statements per row inside the transaction holding the owner lock.
        if (swept.length > 0) {
          await tx.delete(session).where(inArray(session.userId, swept))
        }
        await recordActivity(tx, records)
        return answerFor(targets, outcomes)
      })
      return c.json({ data: { results } })
    },
  )
  .get(
    "/activity",
    describeRoute({
      tags: ["Admin"],
      description:
        "What the console did and who did it, newest first. Append only, so the list never shows an edited row.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.activity.$get({ query: { page: "1", perPage: "25" } }),
)`,
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
  // The flag reaches the routes as well as the page and the nav: with it off, a rule can grant nothing, since the sign-in hook returns on the same flag, so an API that still accepted rules would only be collecting dead rows.
  .use("/allowlist", requireFeature("allowlist"))
  .get(
    "/allowlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "List the rules granting console access. Admin and above; an empty list grants nothing.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$get({ query: { page: "1", perPage: "10" } }),
)`,
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
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$post({ json: { value: "@example.com" } }),
)`,
          },
        ],
      } as object),
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
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist.$delete({ json: { ids } }),
)`,
          },
        ],
      } as object),
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

      const results = await db.transaction(async (tx) => {
        // Deleted in one statement, then read back to say which ids were actually there: the rows are gone after this, so their values only survive in the records written below.
        const removed = await tx
          .delete(allowlist)
          .where(inArray(allowlist.id, targets))
          .returning({ id: allowlist.id, value: allowlist.value })
        const byId = new Map(removed.map((row) => [row.id, row]))
        await recordActivity(
          tx,
          removed.map((row) => ({
            action: "allowlist.remove" as const,
            actor,
            summary: allowlistRemoveSummary(row.value),
          })),
        )
        return targets.map(
          (id): BatchOutcome =>
            byId.has(id) ? { id, ok: true } : refused(id, "NOT_FOUND", "Rule not found"),
        )
      })
      return c.json({ data: { results } })
    },
  )
