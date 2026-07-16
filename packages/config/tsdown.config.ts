import { defineConfig } from "tsdown"

export default defineConfig({
  dts: { tsgo: true },
  entry: ["src/deploy.ts", "src/site.ts"],
  minify: true,
  outDir: "dist",
})
