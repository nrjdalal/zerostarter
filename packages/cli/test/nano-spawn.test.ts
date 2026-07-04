import { expect, test } from "bun:test"

import { nanoSpawn, SubprocessError } from "@/vendor/nano-spawn"

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
