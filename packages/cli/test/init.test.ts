import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { init } from "../bin/commands/init"

// Run `init --dry-run` and capture the printed plan; `setup` can scaffold the dir first.
const planFor = async (args: string[], setup?: (dir: string) => void): Promise<string> => {
  const dir = mkdtempSync(join(tmpdir(), "zs-init-"))
  if (setup) setup(dir)
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

// Scaffold an existing ZeroStarter checkout (init converts it in place).
const scaffoldCheckout = (dir: string): void => {
  mkdirSync(join(dir, "packages/config/src"), { recursive: true })
  writeFileSync(join(dir, "packages/config/src/site.ts"), "// site")
}

describe("init --dry-run plan", () => {
  test("defaults to fetching main", async () => {
    expect(await planFor([])).toContain("fetch main")
  })

  test("--canary plans a canary fetch", async () => {
    expect(await planFor(["--canary"])).toContain("fetch canary")
  })

  test("--canary on an existing checkout is noted as ignored (in place)", async () => {
    const out = await planFor(["--canary"], scaffoldCheckout)
    expect(out).toContain("mode:     in place")
    expect(out).toContain("--canary ignored")
  })

  test("an in-place plan without --canary shows no note", async () => {
    const out = await planFor([], scaffoldCheckout)
    expect(out).toContain("mode:     in place")
    expect(out).not.toContain("--canary ignored")
  })

  test("defaults to the four on-by-default features (waitlist off)", async () => {
    const out = await planFor([])
    expect(out).toContain("features: apiDocs, blog, docs, internalDocs")
  })

  test("--no-blog drops the blog from the plan", async () => {
    const out = await planFor(["--no-blog"])
    expect(out).toContain("features: apiDocs, docs, internalDocs")
  })

  test("--waitlist adds the waitlist to the plan", async () => {
    const out = await planFor(["--waitlist"])
    expect(out).toContain("features: apiDocs, blog, docs, internalDocs, waitlist")
  })

  test("--no-blog wins over --blog (--no- takes precedence)", async () => {
    const out = await planFor(["--blog", "--no-blog"])
    expect(out).toContain("features: apiDocs, docs, internalDocs")
  })
})
