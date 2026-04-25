import { defineConfig } from "tsdown"

export default [
  defineConfig({
    dts: {
      tsgo: true,
    },
    entry: ["src/index.ts"],
    minify: true,
  }),
]
