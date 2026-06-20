import { defineConfig } from "tsdown"

export default [
  defineConfig({
    entry: {
      index: "src/index.ts",
    },
    minify: true,
  }),
  defineConfig({
    dts: false,
    entry: {
      index: "bin/index.ts",
    },
    minify: true,
    outDir: "dist/bin",
  }),
]
