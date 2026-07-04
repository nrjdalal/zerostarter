import { expect, test } from "bun:test"

import { ok, run } from "@/spawn"

test("ok is true for a command that exits 0, false for a missing binary", () => {
  expect(ok("node", ["--version"])).toBe(true)
  expect(ok("zerostarter-nonexistent-binary-xyz", ["--version"])).toBe(false)
})

test("run captures stdout and throws (with stdout/stderr) on a non-zero exit", () => {
  expect(run("node", ["-e", "process.stdout.write('hi')"]).trim()).toBe("hi")
  try {
    run("node", ["-e", "process.stderr.write('boom'); process.exit(3)"])
    throw new Error("expected run to throw")
  } catch (err) {
    const e = err as { status?: number; stderr?: string }
    expect(e.status).toBe(3)
    expect(e.stderr).toContain("boom")
  }
})
