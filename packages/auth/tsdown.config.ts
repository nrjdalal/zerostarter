import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/auth"
import { defineConfig } from "tsdown"

export default [
  defineConfig({
    dts: {
      tsgo: true,
    },
    entry: ["src/index.ts"],
    hooks: {
      "build:prepare": () => {
        getSafeEnv(env, "@packages/auth")
      },
    },
    minify: true,
  }),
]
