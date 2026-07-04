import { expect, test } from "bun:test"

import { ok, run } from "@/spawn"

test("ok is true for a command that exits 0, false for a missing binary", async () => {
  expect(await ok("node", ["--version"])).toBe(true)
  expect(await ok("zerostarter-nonexistent-binary-xyz", ["--version"])).toBe(false)
})

test("run captures stdout and rejects (with stdout/stderr) on a non-zero exit", async () => {
  expect((await run("node", ["-e", "process.stdout.write('hi')"])).trim()).toBe("hi")
  try {
    await run("node", ["-e", "process.stderr.write('boom'); process.exit(3)"])
    throw new Error("expected run to reject")
  } catch (err) {
    const e = err as { exitCode?: number; stderr?: string }
    expect(e.exitCode).toBe(3)
    expect(e.stderr).toContain("boom")
  }
})
