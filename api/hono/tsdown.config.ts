import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    entry: ["src/index.ts"],
    minify: true,
    dts: { tsgo: true },
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env, "@api/hono")
      },
    },
    external: ["bun"],
  }),
]
