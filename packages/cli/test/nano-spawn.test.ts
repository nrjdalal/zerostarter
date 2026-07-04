import { expect, test } from "bun:test"

import {
  applyForceShell,
  escapeArgument,
  escapeFile,
  nanoSpawn,
  SubprocessError,
} from "@/vendor/nano-spawn"

test("nanoSpawn captures stdout on success", async () => {
  const { stdout } = await nanoSpawn("node", ["-e", "process.stdout.write('hi')"], {
    stdio: ["ignore", "pipe", "pipe"],
  })
  expect(stdout).toBe("hi")
})

test("nanoSpawn rejects with stdout/stderr and exitCode on a non-zero exit", async () => {
  try {
    await nanoSpawn("node", ["-e", "process.stderr.write('boom'); process.exit(3)"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    throw new Error("expected a rejection")
  } catch (err) {
    expect(err).toBeInstanceOf(SubprocessError)
    const e = err as SubprocessError
    expect(e.exitCode).toBe(3)
    expect(e.stderr).toContain("boom")
    // the message carries the full command line, not just the binary
    expect(e.message).toContain("node -e")
  }
})

test("nanoSpawn rejects for a missing binary", async () => {
  await expect(
    nanoSpawn("zs-nonexistent-binary-xyz", ["--version"], { stdio: "ignore" }),
  ).rejects.toBeInstanceOf(SubprocessError)
})

// The Windows shim is gated on process.platform, so its escaping never runs on CI; assert it directly with an injected platform.
test("escapeFile escapes cmd.exe meta chars, leaves plain text", () => {
  expect(escapeFile("plain-text")).toBe("plain-text")
  expect(escapeFile("a b")).toBe("a^ b")
  expect(escapeFile("a&b|c>d")).toBe("a^&b^|c^>d")
})

test("escapeArgument double-escapes and quotes an argument", () => {
  expect(escapeArgument("x")).toBe('^^^"x^^^"')
})

test("applyForceShell is a passthrough off Windows", async () => {
  const [file, args, options] = await applyForceShell("bunx", ["--bun", "gitpick"], {}, false)
  expect(file).toBe("bunx")
  expect(args).toEqual(["--bun", "gitpick"])
  expect(options.shell).toBeUndefined()
})

test("applyForceShell shells and escapes a non-exe file on Windows", async () => {
  const [file, args, options] = await applyForceShell("some.cmd", ["a b", "x&y"], {}, true)
  expect(options.shell).toBe(true)
  expect(file).toBe(escapeFile("some.cmd"))
  expect(args).toEqual([escapeArgument("a b"), escapeArgument("x&y")])
})
