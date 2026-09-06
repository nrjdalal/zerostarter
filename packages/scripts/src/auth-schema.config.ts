import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

// The built schema entry by path rather than as a dependency: the auth package already depends on this one for generate-env, and a dependency back would be a cycle. The root auth:schema script builds it first.
import { adapterConfig, schemaOptions } from "../../auth/dist/schema.mjs"

// What the auth CLI loads to generate packages/db/src/schema/auth.ts: the schema-defining options behind an adapter with no database, so the generator sees exactly the plugins and columns the real instance declares. Node runs it (see auth-schema.ts), and the real instance cannot load there because the db client imports bun.
export const auth = betterAuth({
  ...schemaOptions,
  database: drizzleAdapter({}, adapterConfig),
  secret: "schema-generation-only-secret-never-used-",
})
