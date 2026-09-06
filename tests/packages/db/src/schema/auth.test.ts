import { expect, test } from "bun:test"
import { join } from "node:path"

// The committed auth schema is what the auth CLI generates for the declared plugins and columns, byte for byte after the repo formatter. Any hand edit, or a plugin change without a regeneration, fails here. The regenerator runs the CLI under Node on purpose (see packages/scripts/src/auth-schema.ts), which is why this spawns it rather than importing a generator.
const root = join(import.meta.dir, "../../../../..")

test("packages/db/src/schema/auth.ts is exactly what the auth CLI generates", () => {
  const result = Bun.spawnSync(["bun", "run", "auth:schema", "--check"], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", SKIP_ENV_VALIDATION: "true" },
    stderr: "pipe",
    stdout: "pipe",
  })
  const output = `${result.stdout.toString()}\n${result.stderr.toString()}`
  expect(output, output).toContain("auth schema is in sync")
  expect(result.exitCode, output).toBe(0)
})
