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
} from "@packages/db"
import { and, asc, desc, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import {
  ApiError,
  authErrorResponses,
  conflictErrorResponses,
  forbiddenErrorResponses,
  notFoundErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
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

const activityQuerySchema = z.object({
  ...listQueryShape,
  action: facetSchema(ACTIVITY_ACTIONS),
})

const allowlistCreateSchema = z.object({
  value: z.string().trim().min(1).max(254),
})

const roleChangeSchema = z.object({
  role: z.enum(CONSOLE_ROLES),
})

const statusChangeSchema = z.object({
  banned: z.boolean(),
})

// The columns userSchema documents, so both PATCH handlers return exactly what their contract says instead of spreading the row and shipping banReason, banExpires and updatedAt as an undocumented payload.
const RETURNED_USER = {
  banned: user.banned,
  createdAt: user.createdAt,
  email: user.email,
  emailVerified: user.emailVerified,
  id: user.id,
  image: user.image,
  name: user.name,
  role: user.role,
}

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
  // Optional rather than nullable-and-always-present: the list joins the sessions subquery for it, the two PATCH routes do not, and null there would assert never-seen rather than not-asked-for.
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
                    total: z.number().meta({ example: 42 }),
                    users: z.array(userSchema),
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
        total,
        users: rows.map(asUserResponse),
      }
      return c.json({ data })
    },
  )
  .patch(
    "/users/:id/role",
    describeRoute({
      tags: ["Admin"],
      description:
        "Change a user's console role. Refuses the changes that would lock an install out: your own role, a target at or above your rank, granting owner as a non-owner, and demoting the last owner.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.users[":id"].role.$patch({
    json: { role: "member" },
    param: { id: userId },
  }),
)`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.object({ user: userSchema }) })),
            },
          },
        },
        ...validationErrorResponses,
        ...authErrorResponses,
        ...forbiddenErrorResponses,
        ...notFoundErrorResponses,
        ...conflictErrorResponses,
      },
    }),
    sValidator("json", roleChangeSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const targetId = c.req.param("id")
      const { role: nextRole } = c.req.valid("json")

      const updated = await db.transaction(async (tx) => {
        const [target] = await tx.select().from(user).where(eq(user.id, targetId)).limit(1)
        if (!target) {
          throw new ApiError(404, "NOT_FOUND", "User not found")
        }
        // Only a demotion can reduce the owner count, so only that takes the lock. Everything else is protected by the compare-and-set below: a target promoted to owner between this read and that write makes the write match nothing rather than demote an owner unlocked.
        let owners = 0
        if (target.role === "owner") {
          // Counting under the lock, because a count in one statement and an update in another lets two admins each demote one of the last two owners: both read two and both commit. The second waits here, then counts what the first left.
          owners = (
            await tx.select({ id: user.id }).from(user).where(eq(user.role, "owner")).for("update")
          ).length
        }
        const refusal = refuseRoleChange({
          actorRole: actor.role,
          isSelf: actor.id === target.id,
          nextRole,
          // The one part of the decision that needs the database, so the guard itself stays pure.
          targetIsLastOwner: target.role === "owner" && owners <= 1,
          targetRole: target.role,
        })
        if (refusal) {
          throw new ApiError(403, "FORBIDDEN", ROLE_CHANGE_MESSAGES[refusal])
        }
        const [row] = await tx
          .update(user)
          // Stamped so the allowlist treats this rung as decided: without it, demoting someone a rule still matches would be undone by their next sign-in.
          .set({ role: nextRole, roleSetAt: new Date() })
          .where(
            and(
              eq(user.id, targetId),
              target.role === null ? isNull(user.role) : eq(user.role, target.role),
            ),
          )
          .returning(RETURNED_USER)
        if (!row) {
          throw new ApiError(
            409,
            "CONFLICT",
            "This account changed while you were acting on it. Try again.",
          )
        }
        // In the transaction, so the change and the record of it stand or fall together.
        await recordActivity(tx, {
          action: "role.change",
          actor,
          summary: roleChangeSummary(row.email, target.role, nextRole),
        })
        return row
      })
      return c.json({ data: { user: asUserResponse(updated) } })
    },
  )
  .patch(
    "/users/:id/status",
    describeRoute({
      tags: ["Admin"],
      description:
        "Ban or unban a user. Refuses your own account and anyone at or above your rank. A ban ends the person's sessions as well as flagging the account; an unban clears the flag, the reason and any expiry.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.users[":id"].status.$patch({
    json: { banned: true },
    param: { id: userId },
  }),
)`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.object({ user: userSchema }) })),
            },
          },
        },
        ...validationErrorResponses,
        ...authErrorResponses,
        ...forbiddenErrorResponses,
        ...notFoundErrorResponses,
        ...conflictErrorResponses,
      },
    }),
    sValidator("json", statusChangeSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const targetId = c.req.param("id")
      const { banned } = c.req.valid("json")

      const [target] = await db.select().from(user).where(eq(user.id, targetId)).limit(1)
      if (!target) {
        throw new ApiError(404, "NOT_FOUND", "User not found")
      }
      const refusal = refuseBan({
        actorRole: actor.role,
        isSelf: actor.id === target.id,
        targetRole: target.role,
      })
      if (refusal) {
        throw new ApiError(403, "FORBIDDEN", BAN_MESSAGES[refusal])
      }

      // The rung read above is part of the qual, which makes this a compare-and-set: a promotion landing between that read and this write means the guard weighed the wrong rank, so the write finds nothing rather than acting on a stale decision.
      // banned is deliberately not in the qual. Racing this row is last-write-wins, and every outcome of that is the later intent: two bans are idempotent, and a ban losing to an unban leaves the person unbanned with their sessions already swept, which is what an unban means. In the qual, a repeated ban would answer 409 instead of success.
      // Both writes or neither: a flagged row whose session sweep failed would leave the person signed in everywhere behind a 500.
      const updated = await db.transaction(async (tx) => {
        // Only an owner can ban an owner, so sequentially one always remains. Concurrently two of them can ban each other, both pass, and the install has none. Locking the owner rows makes the second wait and count what the first committed, the same serialization the role route needs for the same reason.
        if (banned && target.role === "owner") {
          const owners = await tx
            .select({ banned: user.banned, id: user.id })
            .from(user)
            .where(eq(user.role, "owner"))
            .for("update")
          const active = owners.filter((owner) => owner.id !== targetId && !owner.banned)
          if (active.length === 0) {
            throw new ApiError(
              403,
              "FORBIDDEN",
              "This is the last owner who can still sign in. Promote someone else to owner first.",
            )
          }
        }
        const [row] = await tx
          .update(user)
          .set(
            // Both directions clear the expiry and the reason: the plugin auto-unbans once banExpires is in the past, so a ban that left a stale one would undo itself on the next session check.
            { banExpires: null, banned, banReason: null },
          )
          .where(
            and(
              eq(user.id, targetId),
              target.role === null ? isNull(user.role) : eq(user.role, target.role),
            ),
          )
          .returning(RETURNED_USER)
        if (!row) {
          throw new ApiError(
            409,
            "CONFLICT",
            "This account changed while you were acting on it. Try again.",
          )
        }
        // A ban has to end the person's sessions, not only flag the row: the flag alone leaves them signed in everywhere until each gate happens to re-read it. Same two writes Better Auth's own banUser makes, done here because this route already owns the rank rule the plugin has no notion of.
        if (banned) {
          await tx.delete(session).where(eq(session.userId, targetId))
        }
        await recordActivity(tx, {
          action: banned ? "user.ban" : "user.unban",
          actor,
          summary: banned ? banSummary(row.email) : unbanSummary(row.email),
        })
        return row
      })
      return c.json({ data: { user: asUserResponse(updated) } })
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
                  data: z.object({ events: z.array(activitySchema), total: z.number() }),
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
          total: counted[0] ? counted[0].value : 0,
        },
      })
    },
  )
  // The flag reaches the routes as well as the page and the nav: with it off, a rule can grant nothing, since the sign-in hook returns on the same flag, so an API that still accepted rules would only be collecting dead rows. Both paths are listed because a Hono wildcard does not match the bare segment.
  .use("/allowlist", requireFeature("allowlist"))
  .use("/allowlist/*", requireFeature("allowlist"))
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
                    total: z.number().meta({ example: 3 }),
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
        total: counted[0] ? counted[0].value : 0,
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
          rule: {
            ...created,
            createdAt: created.createdAt.toISOString(),
            actor: c.get("user").email,
            // Narrowed the way the GET narrows it: kind is a text column in the row type, and the declared schema says the union.
            kind: created.kind === "email" ? ("email" as const) : ("domain" as const),
          },
        },
      })
    },
  )
  .delete(
    "/allowlist/:id",
    describeRoute({
      tags: ["Admin"],
      description:
        "Remove a rule. Anyone already granted keeps their role; removing a rule only stops future grants.",
      ...({
        "x-codeSamples": [
          {
            lang: "typescript",
            label: "hono/client",
            source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(
  apiClient.v1.admin.allowlist[":id"].$delete({ param: { id: ruleId } }),
)`,
          },
        ],
      } as object),
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: resolver(z.object({ data: z.object({ id: z.string() }) })),
            },
          },
        },
        ...authErrorResponses,
        ...forbiddenErrorResponses,
        ...notFoundErrorResponses,
      },
    }),
    async (c) => {
      const actor = c.get("user")
      const deleted = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(allowlist)
          .where(eq(allowlist.id, c.req.param("id")))
          .returning({ id: allowlist.id, value: allowlist.value })
        if (!row) {
          throw new ApiError(404, "NOT_FOUND", "Rule not found")
        }
        // The rule is gone after this, so the record is the only place its value survives.
        await recordActivity(tx, {
          action: "allowlist.remove",
          actor,
          summary: allowlistRemoveSummary(row.value),
        })
        return row
      })
      return c.json({ data: { id: deleted.id } })
    },
  )
