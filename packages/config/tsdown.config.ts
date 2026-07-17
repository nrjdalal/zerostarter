import { defineConfig } from "tsdown"

export default defineConfig({
  dts: true,
  entry: ["src/site.ts"],
  minify: true,
  outDir: "dist",
})
