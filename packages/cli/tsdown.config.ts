import { defineConfig } from "tsdown"

export default defineConfig({
  dts: true,
  entry: {
    index: "src/index.ts",
    "bin/index": "bin/index.ts",
  },
  minify: true,
})
