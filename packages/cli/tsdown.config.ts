import { defineConfig } from "tsdown"

export default defineConfig({
  dts: { tsgo: true },
  entry: {
    index: "src/index.ts",
    "bin/index": "bin/index.ts",
  },
  minify: true,
})
