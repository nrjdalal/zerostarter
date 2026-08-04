import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/console.ts", "src/site.ts"],
  minify: true,
  outDir: "dist",
})
