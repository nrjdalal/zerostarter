import type { BetterAuthOptions } from "better-auth"
import {
  admin as adminPlugin,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"
import { userAc } from "better-auth/plugins/admin/access"

import { ACCESS_ROLE, CONSOLE_ROLES, roleAtLeast } from "@/access"

// Everything that decides the database schema, in one place, so the auth instance and the schema generator read one declaration: the plugins, with the tables and columns they bring, and the app's own columns. packages/db/src/schema/auth.ts is generated from it (bun run auth:schema) and never edited by hand. Nothing here may reach the database or the environment: the auth CLI loads it under Node, where the db client (which imports bun) cannot load.
export const adapterConfig = { provider: "pg" } as const

export const schemaOptions = {
  // The console's own column on user, declared here so the generated schema carries it: stamped by every deliberate rung change, never accepted from a client and never returned to one.
  user: {
    additionalFields: {
      roleSetAt: { type: "date", input: false, required: false, returned: false },
    },
  },
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
    // The plugin validates adminRoles against its own role table, so the ladder's rungs are declared here as well as ranked in @/access.
    // Every rung holds no statements, which is deliberate and load-bearing. The plugin mounts its own endpoints at /api/auth/admin/*, and its middleware authorizes on these statements alone: it has no notion of rank, of who the actor is relative to the target, or of the last owner. Hand an admin the stock adminAc and one request to /api/auth/admin/set-role makes them an owner, bans an owner, or resets an owner's password, and every rule in @/access becomes a comment. Verified: it did exactly that before this was narrowed.
    // So the console's own routes own all of it, guarded by refuseRoleChange and refuseBan, and the plugin keeps only what nothing else provides: the role, banned, banReason and banExpires columns, and the session check that refuses a banned user. A fork that wants the plugin's endpoints should widen one statement at a time and accept that the ladder does not constrain them.
    adminPlugin({
      // Derived, not restated: the rungs the plugin treats as admin are the rungs the ladder admits to Access, and every rung is declared so the plugin's own validation passes.
      adminRoles: CONSOLE_ROLES.filter((role) => roleAtLeast(role, ACCESS_ROLE)),
      roles: Object.fromEntries(CONSOLE_ROLES.map((role) => [role, userAc])),
    }),
  ],
} satisfies Pick<BetterAuthOptions, "plugins" | "user">
