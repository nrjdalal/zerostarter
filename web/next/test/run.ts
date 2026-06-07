/**
 * Test orchestrator: ensure the stack is up (via the shared lifecycle in
 * stack.ts, which tears down only what it starts), then run the bun-test target
 * passed after `--`. `--browser` also requires the agent-browser CLI.
 *
 * Use the package scripts (`bun run test`, `bun run test:e2e`), not `bun test` —
 * the latter is Bun's built-in runner and skips this wrapper. See the
 * `web-spec` skill.
 */
import { ensureStack } from "./stack"

const webNext = `${import.meta.dir}/..`
const wantBrowser = process.argv.includes("--browser")
const sep = process.argv.indexOf("--")
const testArgs = sep >= 0 ? process.argv.slice(sep + 1) : ["test/"]

const teardown = await ensureStack({ browser: wantBrowser })

let code = 1
try {
  const test = Bun.spawn(["bun", "test", ...testArgs], {
    cwd: webNext,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: process.env,
  })
  code = await test.exited
} finally {
  teardown()
}
process.exit(code)

export {}
