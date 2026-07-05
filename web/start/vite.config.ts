import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import mdx from "fumadocs-mdx/vite"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  // The monorepo keeps one .env at the repo root; point Vite there so VITE_* vars load in every invocation, not only under turbo/bun.
  envDir: "../..",
  server: {
    // 3001 by default so web/next can keep 3000 during the migration; override with PORT for parity runs against the test suite.
    port: Number(process.env.PORT ?? 3001),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    mdx(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        // Keep the Next.js-era structure: routes live in src/app, mirroring web/next; support modules colocated there (providers) are not routes.
        routesDirectory: "app",
        routeFileIgnorePattern: "providers\\.tsx",
      },
    }),
    viteReact(),
    // React Compiler, matching web/next's reactCompiler: true.
    babel({ presets: [reactCompilerPreset()] }),
    nitro({ preset: "bun" }),
  ],
})
