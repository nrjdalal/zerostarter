import { sValidator } from "@hono/standard-validator"
import type { Session } from "@packages/auth"
import { db, user } from "@packages/db"
import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import {
  ApiError,
  authErrorResponses,
  forbiddenErrorResponses,
  validationErrorResponses,
} from "@/lib/error"
import { adminMiddleware } from "@/middlewares"

const ROLES = ["admin", "user"] as const

const usersQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
  role: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",") : []))
    .pipe(z.array(z.enum(ROLES)).max(ROLES.length)),
  sort: z.enum(["createdAt", "email", "name", "role"]).default("createdAt"),
})

const userSchema = z.object({
  createdAt: z.string().meta({ format: "date-time", example: "2025-12-17T14:33:40.317Z" }),
  email: z.string().meta({ example: "user@example.com" }),
  emailVerified: z.boolean().meta({ example: true }),
  id: z.string().meta({ example: "iO8PZYiiwR6e0o9XDtqyAmUemv1Pc8tc" }),
  image: z.string().nullable().meta({ example: "https://example.com/avatar.png" }),
  name: z.string().meta({ example: "John Doe" }),
  role: z.string().meta({ example: "user" }),
})

const sortColumns = {
  createdAt: user.createdAt,
  email: user.email,
  name: user.name,
  role: user.role,
}

// Escape LIKE wildcards so a search for "100%" matches literally.
const escapeLike = (value: string) => value.replace(/[%_\\]/g, "\\$&")

// Admin-only endpoints, mounted under /v1 behind authMiddleware; adminMiddleware layers the role check on top.
export const adminRouter = new Hono<{
  Variables: Session
}>()
  .use("/*", adminMiddleware)
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
      // The role column defaults to "user" but predates rows may hold null; treat null as "user".
      const roleConditions = role.map((value) =>
        value === "user" ? or(eq(user.role, "user"), isNull(user.role)) : eq(user.role, value),
      )
      const where = and(search, roleConditions.length ? or(...roleConditions) : undefined)

      const [rows, total] = await Promise.all([
        db
          .select({
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
        db.$count(user, where),
      ])

      const data = {
        total,
        users: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          role: row.role ? row.role : "user",
        })),
      }
      return c.json({ data })
    },
  )
