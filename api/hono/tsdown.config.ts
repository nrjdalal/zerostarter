import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    entry: ["src/index.ts"],
    minify: true,
    noExternal: ["@packages/auth", "@packages/db", "@packages/env"],
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env)
      },
    },
  }),
]
