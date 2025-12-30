import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/db"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    entry: ["src/index.ts"],
    minify: true,
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env, "@packages/db")
      },
    },
    external: ["bun"],
  }),
]
