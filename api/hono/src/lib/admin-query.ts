import { z } from "zod"

export const ROLES = ["admin", "user"] as const
// Single source for the sortable columns: the schema enum and the router's column map both derive from it.
export const SORTS = ["banned", "createdAt", "email", "name", "role"] as const

// Query contract for GET /api/v1/admin/users. Lives here rather than in the router so it can be tested without importing the router, which boots the db client and Better Auth.
export const usersQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(254).optional(),
  role: z
    .string()
    .optional()
    .transform((value) => (value ? [...new Set(value.split(","))] : []))
    .pipe(z.array(z.enum(ROLES)).max(ROLES.length)),
  sort: z.enum(SORTS).default("createdAt"),
})
