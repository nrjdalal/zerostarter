import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Post-build fixups for the Vercel Build Output API function (no-op locally: the bun preset produces
// .output, not .vercel/output). Two Nitro-vercel-preset gaps this closes:
//
// 1. Runtime: the preset forces the function runtime to bun1.x whenever the build runs under Bun
//    (nitro/dist/_presets.mjs; the assignment is unconditional, so no config bypasses it) and our
//    build must use Bun. Vercel's Bun runtime fails to run this function, so rewrite it to Node. The
//    bundle is Node-ESM with `launcherType: "Nodejs"`, so it runs on Node unchanged.
//
// 2. takumi: it is external to the bundle (its wasm can't be bundled into the shared shiki chunk
//    without crashing SSR - see vite.config.ts), and the vercel preset does not trace externals into
//    the function, so the bare `import "takumi-js"` would 500 at runtime. Materialize the takumi
//    closure into the function's node_modules from the build env, which carries the right platform
//    binding. A load-check fails the build loudly if the closure is wrong.

const FUNCS = ".vercel/output/functions"
const RUNTIME = "nodejs22.x"

if (!existsSync(FUNCS)) process.exit(0)

for (const entry of readdirSync(FUNCS)) {
  if (!entry.endsWith(".func")) continue
  const cfgPath = join(FUNCS, entry, ".vc-config.json")
  if (!existsSync(cfgPath)) continue
  const cfg = JSON.parse(readFileSync(cfgPath, "utf8"))
  if (typeof cfg.runtime === "string" && cfg.runtime.startsWith("bun")) {
    const was = cfg.runtime
    cfg.runtime = RUNTIME
    writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`)
    console.log(`[vercel-runtime] ${entry}: runtime ${was} -> ${RUNTIME}`)
  }
}

const server = join(FUNCS, "__server.func")
if (existsSync(join(server, "index.mjs"))) {
  execSync(
    [
      "set -eu",
      `NM="${server}/node_modules"`,
      'mkdir -p "$NM/@takumi-rs"',
      'cp -RL ../../node_modules/.bun/takumi-js@*/node_modules/. "$NM/"',
      'cp -RL node_modules/@takumi-rs/. "$NM/@takumi-rs/"',
      'cd "$NM/.." && bun -e \'await import("takumi-js")\'',
    ].join("\n"),
    { stdio: "inherit", shell: "/bin/bash" },
  )
  console.log("[vercel-runtime] materialized takumi into the function node_modules")
}
