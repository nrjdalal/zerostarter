import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/db"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    deps: {
      neverBundle: ["bun"],
    },
    dts: {
      tsgo: true,
    },
    entry: ["src/index.ts"],
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env, "@packages/db")
      },
    },
    minify: true,
  }),
]
