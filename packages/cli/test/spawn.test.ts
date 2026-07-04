import { expect, test } from "bun:test"

import { ok, printError, run, runTail } from "@/spawn"

// Capture everything written to a stream while `fn` runs, restoring it (and TTY shape) afterward.
const captureStream = async (
  stream: NodeJS.WriteStream,
  fn: () => void | Promise<void>,
  tty?: { columns: number },
): Promise<string> => {
  const writes: string[] = []
  const origWrite = stream.write.bind(stream)
  const origIsTTY = stream.isTTY
  const origCols = stream.columns
  stream.write = (chunk: unknown): boolean => {
    writes.push(String(chunk))
    return true
  }
  if (tty) {
    Object.defineProperty(stream, "isTTY", { configurable: true, value: true })
    Object.defineProperty(stream, "columns", { configurable: true, value: tty.columns })
  }
  try {
    await fn()
  } finally {
    stream.write = origWrite
    Object.defineProperty(stream, "isTTY", { configurable: true, value: origIsTTY })
    Object.defineProperty(stream, "columns", { configurable: true, value: origCols })
  }
  return writes.join("")
}

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
        done: "Installed dependencies",
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
  expect(all).toContain("pkg 0") // intermediate lines were rendered
  // On completion it collapses to the done label and keeps the tail (last `lines` output lines) beneath.
  const finalFrame = all.slice(all.lastIndexOf("[0J") + 3)
  expect(finalFrame).toContain("Installed dependencies") // the done label header
  expect(finalFrame).toContain("pkg 7") // tail retained, not erased
  expect(finalFrame).toContain("42 packages installed") // and the last output line lands in the tail
})

// Run a failing node script that writes $ZS_TEST_STDERR to stderr, and return the rejection. The marker is passed via env (not the -e source) so it appears only in the child's captured stderr, never echoed in the SubprocessError's command message.
const failWithStderr = async (marker: string): Promise<unknown> => {
  process.env.ZS_TEST_STDERR = marker
  try {
    await run("node", [
      "-e",
      "process.stderr.write(process.env.ZS_TEST_STDERR + '\\n'); process.exit(1)",
    ])
  } catch (err) {
    return err
  } finally {
    delete process.env.ZS_TEST_STDERR
  }
  throw new Error("expected the subprocess to reject")
}

test("printError shows the message, plus a failed subprocess's captured stderr the bare message omits", async () => {
  const caught = await failWithStderr("fatal: repository not found")
  const out = await captureStream(process.stderr, () => {
    printError(new Error("plain boom"))
    printError(caught)
  })
  expect(out).toContain("plain boom")
  expect(out).toContain("Command failed with exit code 1") // the subprocess message
  expect(out).toContain("fatal: repository not found") // and the real cause, recovered from its stderr
})

test("printError does not repeat output runTail already dumped", async () => {
  process.env.ZS_TEST_STDERR = "kaboom-tail-marker"
  let caught: unknown
  await captureStream(
    process.stdout,
    async () => {
      try {
        await runTail(
          "node",
          ["-e", "process.stderr.write(process.env.ZS_TEST_STDERR + '\\n'); process.exit(1)"],
          { label: "Working", done: "done" },
        )
      } catch (err) {
        caught = err
      }
    },
    { columns: 80 },
  )
  delete process.env.ZS_TEST_STDERR
  const out = await captureStream(process.stderr, () => printError(caught))
  expect(out).toContain("Command failed") // the message still prints
  expect(out).not.toContain("kaboom-tail-marker") // but the tail is not repeated (runTail already showed it)
})
