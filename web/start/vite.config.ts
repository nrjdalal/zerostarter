import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import mdx from "fumadocs-mdx/vite"
import { nitro } from "nitro/vite"
import { defineConfig, type Plugin } from "vite"

// Dev-only mirror of the .md/.txt rewrite in src/server.ts: Vite's own middleware 404s unknown extension-ful paths before Start's handler sees them, so rewrite to the registered /llms.txt routes first. The built server routes everything through src/server.ts instead.
const mdAliasDev: Plugin = {
  name: "md-alias-rewrite",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const match = req.url?.match(/^\/(docs|blog)(?:\/([^?]+))?\.(?:md|txt)(\?.*)?$/)
      if (match) {
        req.url = `/llms.txt/${match[1]}${match[2] ? `/${match[2]}` : ""}${match[3] ?? ""}`
      }
      next()
    })
  },
}

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
    mdAliasDev,
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
