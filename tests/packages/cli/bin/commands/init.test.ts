import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { FEATURE_DEFS, init } from "../../../../../packages/cli/bin/commands/init"

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
    // toContain is a prefix match, so assert waitlist is actually absent.
    expect(out).not.toContain("waitlist")
  })

  test("--no-blog drops the blog from the plan", async () => {
    const out = await planFor(["--no-blog"])
    expect(out).toContain("features: apiDocs, docs, internalDocs")
    expect(out).not.toContain("waitlist")
  })

  test("--waitlist adds the waitlist to the plan", async () => {
    const out = await planFor(["--waitlist"])
    expect(out).toContain("features: apiDocs, blog, docs, internalDocs, waitlist")
  })

  // --allowlist was in FEATURE_DEFS and in the docs while the parser had never heard of it, so the documented command died on "Unknown option". The parser and the help are now built from that list; these hold them to it.
  test("--allowlist adds the allowlist to the plan", async () => {
    const plan = await planFor(["--allowlist"])
    expect(plan).toContain("features: allowlist, apiDocs, blog, docs, internalDocs")
  })

  test("the parser accepts both forms of every feature flag", async () => {
    const exit = process.exit
    process.exit = ((code?: number) => {
      throw new Error(`the parser rejected a flag and exited ${code}`)
    }) as typeof process.exit
    try {
      for (const { flag } of FEATURE_DEFS) {
        expect(await planFor([`--${flag}`])).toContain("features:")
        expect(await planFor([`--no-${flag}`])).toContain("features:")
      }
    } finally {
      process.exit = exit
    }
  })

  test("--help names both forms of every feature flag, and which are off by default", async () => {
    const help = await planFor(["--help"])
    for (const { flag } of FEATURE_DEFS) {
      expect(help).toContain(`--${flag},`)
      expect(help).toContain(`--no-${flag}`)
    }
    expect(help).toContain("except allowlist and waitlist")
  })

  test("--no-blog wins over --blog (--no- takes precedence)", async () => {
    const out = await planFor(["--blog", "--no-blog"])
    expect(out).toContain("features: apiDocs, docs, internalDocs")
  })
})
