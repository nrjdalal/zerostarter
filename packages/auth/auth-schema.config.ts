import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

import { adapterConfig, schemaOptions } from "@/schema"

// What the auth CLI loads to generate packages/db/src/schema/auth.ts (bun run auth:schema): the schema-defining options behind an adapter with no database, so the generator sees exactly the plugins and columns the real instance declares. It sits beside this package's tsconfig because the CLI resolves the @/ alias from its working directory. Node runs it, and the real instance cannot load there because the db client imports bun.
export const auth = betterAuth({
  ...schemaOptions,
  database: drizzleAdapter({}, adapterConfig),
  secret: "schema-generation-only-secret-never-used-",
})
