import { expect, test } from "bun:test"

import { ok, run, runTail } from "@/spawn"

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

test("runTail draws a rolling window on a TTY, then collapses to the summary", async () => {
  const stdout = process.stdout
  const writes: string[] = []
  const origWrite = stdout.write.bind(stdout)
  const origIsTTY = stdout.isTTY
  const origCols = stdout.columns
  stdout.write = (chunk: unknown): boolean => {
    writes.push(String(chunk))
    return true
  }
  Object.defineProperty(stdout, "isTTY", { configurable: true, value: true })
  Object.defineProperty(stdout, "columns", { configurable: true, value: 80 })
  try {
    await runTail(
      "node",
      [
        "-e",
        "for (let i = 0; i < 8; i++) console.log('pkg ' + i); console.log('42 packages installed')",
      ],
      {
        lines: 5,
        label: "Installing",
        summarize: (out) => out.match(/[\d,]+ packages installed[^\n]*/)?.[0] ?? "",
      },
    )
  } finally {
    stdout.write = origWrite
    Object.defineProperty(stdout, "isTTY", { configurable: true, value: origIsTTY })
    Object.defineProperty(stdout, "columns", { configurable: true, value: origCols })
  }
  const all = writes.join("")
  expect(all).toMatch(/\[\d+A/) // cursor-up: the window was redrawn in place
  expect(all).toContain("[?7l") // auto-wrap disabled so a wide/long line can't wrap and grow the window
  expect(all).toContain("[?7h") // and re-enabled afterwards
  expect(all).toContain("pkg 0") // intermediate lines were rendered (then erased)
  expect(all).toContain("42 packages installed") // and the summary printed at the end
})
