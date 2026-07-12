import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { init } from "../bin/commands/init"

// Run `init --dry-run` against a fresh empty dir and capture the printed plan.
const planFor = async (args: string[]): Promise<string> => {
  const dir = mkdtempSync(join(tmpdir(), "zs-init-"))
  const lines: string[] = []
  const original = console.log
  console.log = (...parts: unknown[]) => {
    lines.push(parts.join(" "))
  }
  try {
    await init([dir, ...args, "--dry-run"])
  } finally {
    console.log = original
    rmSync(dir, { force: true, recursive: true })
  }
  return lines.join("\n")
}

describe("init --dry-run plan", () => {
  test("defaults to fetching main", async () => {
    expect(await planFor([])).toContain("fetch main")
  })

  test("--canary plans a canary fetch", async () => {
    expect(await planFor(["--canary"])).toContain("fetch canary")
  })
})
