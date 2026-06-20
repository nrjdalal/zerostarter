import { defineConfig } from "tsdown"

export default defineConfig({
  dts: { tsgo: true },
  entry: ["src/site.ts"],
  minify: true,
  outDir: "dist",
})
