import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

// Post-build fixup for the Vercel Build Output API function (no-op locally: the bun preset produces
// .output, not .vercel/output). The function runs on Vercel's bun1.x runtime (Nitro sets it because
// the build runs under Bun): the SSR bundle uses Bun's `ReadableStream({ type: "direct" })`, which
// Node does not support, so a Node runtime is not an option here. takumi is external to the bundle
// (its wasm can't be bundled into the shared shiki chunk without crashing SSR - see vite.config.ts)
// and the vercel preset does not trace externals into the function, so the bare `import "takumi-js"`
// would not resolve at runtime. Materialize the takumi closure into the function's node_modules from
// the build env (which carries the right platform binding); a load-check fails the build loudly if
// the closure is wrong.

const server = ".vercel/output/functions/__server.func"

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
