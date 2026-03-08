import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    deps: {
      alwaysBundle: [/^@packages\//],
      neverBundle: ["bun"],
    },
    dts: {
      tsgo: true,
    },
    entry: ["src/index.ts"],
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env, "@api/hono")
      },
    },
    minify: true,
  }),
]
