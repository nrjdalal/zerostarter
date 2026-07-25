import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import type { RoleChangeRefusal } from "@packages/auth/access"
import { CONSOLE_ROLES, parseAllowlistRule, refuseRoleChange } from "@packages/auth/access"
import { allowlist, db, user } from "@packages/db"
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import {
  ApiError,
  authErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { escapeLike } from "@/lib/sql"
import { consoleReadMiddleware, consoleWriteMiddleware } from "@/middlewares"

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

const allowlistSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2026-01-21T13:06:25.712Z" }),
  createdBy: z.string().nullable().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  createdByName: z.string().nullable().meta({ example: "Ada Lovelace" }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  kind: z.enum(["domain", "email"]).meta({ example: "domain" }),
  value: z.string().meta({ example: "@example.com" }),
})

const allowlistQuerySchema = z.object({
  kind: z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(["domain", "email"])).max(2)),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
})

const allowlistCreateSchema = z.object({
  value: z.string().trim().min(1).max(254),
})

const roleChangeSchema = z.object({
  role: z.enum(CONSOLE_ROLES),
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

// Console endpoints, mounted under /v1 behind authMiddleware; the console gate layers the fresh rank check on top, reading at member and writing at admin.
export const adminRouter = new Hono<{
  Variables: Session
}>()
  .use("/*", consoleReadMiddleware)
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
        users: rows.map((row) => ({
          ...row,
          banned: row.banned ? true : false,
          createdAt: row.createdAt.toISOString(),
          role: row.role ? row.role : "user",
        })),
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
      },
    }),
    consoleWriteMiddleware,
    sValidator("json", roleChangeSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
      }
    }),
    async (c) => {
      const actor = c.get("user")
      const targetId = c.req.param("id")
      const { role: nextRole } = c.req.valid("json")

      const [target] = await db.select().from(user).where(eq(user.id, targetId)).limit(1)
      if (!target) {
        throw new ApiError(404, "NOT_FOUND", "User not found")
      }
      // The one part of the decision that needs the database, so the guard itself stays pure.
      const targetIsLastOwner =
        target.role === "owner" && (await db.$count(user, eq(user.role, "owner"))) <= 1
      const refusal = refuseRoleChange({
        actorRole: actor.role,
        isSelf: actor.id === target.id,
        nextRole,
        targetIsLastOwner,
        targetRole: target.role,
      })
      if (refusal) {
        throw new ApiError(403, "FORBIDDEN", ROLE_CHANGE_MESSAGES[refusal])
      }

      const [updated] = await db
        .update(user)
        .set({ role: nextRole })
        .where(eq(user.id, targetId))
        .returning()
      return c.json({
        data: {
          user: {
            ...updated,
            banned: updated.banned ? true : false,
            createdAt: updated.createdAt.toISOString(),
            role: updated.role ? updated.role : "user",
          },
        },
      })
    },
  )
  .get(
    "/allowlist",
    describeRoute({
      tags: ["Admin"],
      description:
        "List the rules deciding who may create an account. Readable by any console role; an empty list admits everyone.",
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
      const { kind, page, perPage, q } = c.req.valid("query")
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
          .orderBy(asc(allowlist.value))
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
        "Add a rule. A leading @ makes it a domain rule, anything else must parse as an address; both are normalized lowercase.",
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
      },
    }),
    consoleWriteMiddleware,
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
        throw new ApiError(409, "CONFLICT", `${rule.value} is already on the list.`)
      }
      const [created] = await db
        .insert(allowlist)
        .values({ createdBy: c.get("user").id, kind: rule.kind, value: rule.value })
        .returning()
      return c.json({
        data: {
          rule: {
            ...created,
            createdAt: created.createdAt.toISOString(),
            createdByName: c.get("user").name,
            kind: rule.kind,
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
        "Remove a rule. Removing the last one reopens sign-up to everyone; no existing account is affected either way.",
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
      },
    }),
    consoleWriteMiddleware,
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
