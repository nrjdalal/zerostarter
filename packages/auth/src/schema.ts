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
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
    // The plugin validates adminRoles against its own role table, so the ladder's rungs are declared here as well as ranked in @/access.
    // Every rung holds no statements, deliberately: the plugin mounts /api/auth/admin/* and authorizes on statements alone, with no notion of rank, of the actor's position relative to the target, or of the last owner, so the stock adminAc let one set-role request make an admin an owner (verified before this was narrowed). The console's own routes own all of it, guarded by refuseRoleChange and refuseBan, and the plugin keeps only what nothing else provides: the role, banned, banReason and banExpires columns, and the session check that refuses a banned user. A fork that wants the plugin's endpoints widens one statement at a time and accepts that the ladder does not constrain them.
    adminPlugin({
      // Derived, not restated: the rungs the plugin treats as admin are the rungs the ladder admits to Access, and every rung is declared so the plugin's own validation passes.
      adminRoles: CONSOLE_ROLES.filter((role) => roleAtLeast(role, ACCESS_ROLE)),
      roles: Object.fromEntries(CONSOLE_ROLES.map((role) => [role, userAc])),
    }),
  ],
  // The console's own column on user, declared here so the generated schema carries it: stamped by every deliberate rung change, never accepted from a client and never returned to one.
  user: {
    additionalFields: {
      roleSetAt: { input: false, required: false, returned: false, type: "date" },
    },
  },
} satisfies Pick<BetterAuthOptions, "plugins" | "user">
