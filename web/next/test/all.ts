/**
 * test:all — the whole suite in one stack lifecycle. Boots the stack ONCE (via
 * the shared ensureStack), then runs the full behavioral suite (deterministic +
 * browser + the real waitlist DB write) followed by the visual-parity diff, and
 * tears down only what it started. Both tiers run regardless of each other's
 * result — you get the complete picture in one pass — and the run exits non-zero
 * if either failed.
 *
 * Visual parity needs a baseline: run `test:visual:update` against the reference
 * first, or the visual tier reports the missing-baseline error. Use `bun run
 * test:all`, not `bun test`. See the `web-spec` skill.
 */
import { ensureStack } from "./stack"
import { visualParity } from "./visual"

const webNext = `${import.meta.dir}/..`

const teardown = await ensureStack({ browser: true })

let code = 0
try {
  // tiers 1+2: the full behavioral suite, browser + db-write gates on (same env
  // as test:e2e). Run as a subprocess so bun's test runner owns its own output.
  const behavioral = Bun.spawn(["bun", "test", "test/"], {
    cwd: webNext,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: { ...process.env, BROWSER_TESTS: "true", ALLOW_DB_WRITES: "true" },
  })
  if ((await behavioral.exited) !== 0) code = 1

  // tier 3: visual parity. The stack is already up, so call it in-process — no
  // second ensureStack, no second boot. A throw here (ab()/sharp) fails the tier
  // without skipping teardown.
  try {
    const result = await visualParity(false)
    ;(result.ok ? console.log : console.error)(result.summary)
    if (!result.ok) code = 1
  } catch (e) {
    if (e instanceof Error && e.stack) console.error(e.stack)
    console.error(`\n✗ visual run errored: ${e instanceof Error ? e.message : String(e)}\n`)
    code = 1
  }
} finally {
  teardown()
}
process.exit(code)

export {}
