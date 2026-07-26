import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import type { BanRefusal, RoleChangeRefusal } from "@packages/auth/access"
import {
  CONSOLE_ROLES,
  parseAllowlistRule,
  refuseBan,
  refuseRoleChange,
} from "@packages/auth/access"
import { allowlist, db, session, user } from "@packages/db"
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
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

// Single source for the sortable columns: the schema enum and the column map both derive from it.
const SORTS = ["banned", "createdAt", "email", "name", "role"] as const

const usersQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
  role: z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(CONSOLE_ROLES)).max(CONSOLE_ROLES.length)),
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
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  createdBy: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdByName: z.string().nullable().meta({ example: "Ada Lovelace" }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  kind: z.enum(["domain", "email"]).meta({ example: "domain" }),
  value: z.string().meta({ example: "@example.com" }),
})

// One tuple feeds the enum and the column map, so a sortable column cannot exist in one and not the other.
const ALLOWLIST_SORTS = ["createdAt", "createdByName", "kind", "value"] as const

const allowlistQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("desc"),
  kind: z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(["domain", "email"])).max(2)),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
  sort: z.enum(ALLOWLIST_SORTS).default("createdAt"),
})

const allowlistSortColumns = {
  createdAt: allowlist.createdAt,
  // The author's name comes from the join, so sorting by it sorts what the column actually shows; a seeded rule has none and sorts last under both directions in Postgres' default NULL ordering.
  createdByName: user.name,
  kind: allowlist.kind,
  value: allowlist.value,
} satisfies Record<(typeof ALLOWLIST_SORTS)[number], unknown>

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
  name: string
  role: string | null
}) => ({
  ...row,
  banned: row.banned ? true : false,
  createdAt: row.createdAt.toISOString(),
  role: row.role ? row.role : "user",
})

const userSchema = z.object({
  banned: z.boolean().meta({ example: false }),
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  name: z.string().meta({ example: "John Doe" }),
  role: z.string().meta({ example: "user" }),
})

const sortColumns = {
  // status sorts by the backing flag; null means never banned
  banned: sql`coalesce(${user.banned}, false)`,
  createdAt: user.createdAt,
  email: user.email,
  name: user.name,
  // sort null-role rows with the "user" label they display as, instead of nulls splitting the group
  role: sql`coalesce(${user.role}, 'user')`,
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
      // The role column defaults to "user", but rows created before the default may hold null; treat null as "user".
      const roleConditions = role.map((value) =>
        value === "user" ? or(eq(user.role, "user"), isNull(user.role)) : eq(user.role, value),
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
            name: user.name,
            role: user.role,
          })
          .from(user)
          .where(where)
          .orderBy(dir === "asc" ? asc(sortColumns[sort]) : desc(sortColumns[sort]), asc(user.id))
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

      // Counting owners and then updating in a second statement is not enough: two admins each demoting one of the last two owners both read two, both pass, and the install ends with none. Locking the owner rows first makes the second request wait, then re-read what the first committed and refuse. Every role change queues behind that lock, not only the ones touching an owner, which is the right trade at the scale a console operates at.
      // The count includes banned owners, which cannot strand an install: banning an owner already takes another owner, and that one stays active.
      const updated = await db.transaction(async (tx) => {
        const owners = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "owner"))
          .for("update")
        const [target] = await tx.select().from(user).where(eq(user.id, targetId)).limit(1)
        if (!target) {
          throw new ApiError(404, "NOT_FOUND", "User not found")
        }
        const refusal = refuseRoleChange({
          actorRole: actor.role,
          isSelf: actor.id === target.id,
          nextRole,
          // The one part of the decision that needs the database, so the guard itself stays pure.
          targetIsLastOwner: target.role === "owner" && owners.length <= 1,
          targetRole: target.role,
        })
        if (refusal) {
          throw new ApiError(403, "FORBIDDEN", ROLE_CHANGE_MESSAGES[refusal])
        }
        const [row] = await tx
          .update(user)
          .set({ role: nextRole })
          .where(eq(user.id, targetId))
          .returning(RETURNED_USER)
        // Only owner rows are locked above, so a target below that rung can still be deleted between the read and this write.
        if (!row) {
          throw new ApiError(404, "NOT_FOUND", "User not found")
        }
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

      // Unbanning clears the reason and any expiry too, so a later ban cannot inherit the last one's terms.
      // The rung read above is part of the qual, which makes this a compare-and-set: a promotion landing between that read and this write means the guard weighed the wrong rank, so the write finds nothing rather than acting on a stale decision. Cheaper than the role route's lock, and enough here, because the invariant is about this one row.
      // Both writes or neither: a ban that flagged the row and then failed to clear the sessions would answer 500 while leaving the person signed in everywhere, which is the one outcome this route promises cannot happen.
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
          .set(banned ? { banned: true } : { banExpires: null, banned: false, banReason: null })
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
        return row
      })
      return c.json({ data: { user: asUserResponse(updated) } })
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
        q ? ilike(allowlist.value, `%${escapeLike(q)}%`) : undefined,
        kind.length ? or(...kind.map((value) => eq(allowlist.kind, value))) : undefined,
      ].filter((condition) => condition !== undefined)
      const where = conditions.length ? and(...conditions) : undefined

      const [rows, total] = await Promise.all([
        db
          .select({
            createdAt: allowlist.createdAt,
            createdBy: allowlist.createdBy,
            createdByName: user.name,
            id: allowlist.id,
            kind: allowlist.kind,
            value: allowlist.value,
          })
          .from(allowlist)
          .leftJoin(user, eq(user.id, allowlist.createdBy))
          .where(where)
          .orderBy(
            dir === "asc" ? asc(allowlistSortColumns[sort]) : desc(allowlistSortColumns[sort]),
            asc(allowlist.id),
          )
          .limit(perPage)
          .offset((page - 1) * perPage),
        db.$count(allowlist, where),
      ])

      const data = {
        rules: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          kind: row.kind === "email" ? ("email" as const) : ("domain" as const),
        })),
        total,
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
      let created
      try {
        ;[created] = await db
          .insert(allowlist)
          .values({ createdBy: c.get("user").id, value: rule.value })
          .returning()
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiError(409, "CONFLICT", alreadyListed(rule.value))
        }
        throw error
      }
      if (!created) {
        throw new ApiError(409, "CONFLICT", alreadyListed(rule.value))
      }
      return c.json({
        data: {
          rule: {
            ...created,
            createdAt: created.createdAt.toISOString(),
            createdByName: c.get("user").name,
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
      const [deleted] = await db
        .delete(allowlist)
        .where(eq(allowlist.id, c.req.param("id")))
        .returning({ id: allowlist.id })
      if (!deleted) {
        throw new ApiError(404, "NOT_FOUND", "Rule not found")
      }
      return c.json({ data: { id: deleted.id } })
    },
  )
