import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

import {
  convertRepo,
  fixDangling,
  rebrandPortlessFromRoot,
} from "../../../../packages/cli/src/convert"
import { exists, read, readJson, write } from "../../../../packages/cli/src/io"
import { SKILL_LEDGER } from "../../../../packages/cli/src/skills"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-convert-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

// The shared fonts.ts that ships to forks: generic fonts only, no fonts/marketing/ refs.
const FONTS = `import localFont from "next/font/local"

export const dmSans = localFont({ src: "../fonts/dm-sans.woff2" })
`

// A regression fixture: a marketing font leaked back into the shared file (its woff2 dir is fork-excluded, so this would break the fork build).
const FONTS_LEAKED = `import localFont from "next/font/local"

export const dmSans = localFont({ src: "../fonts/dm-sans.woff2" })

export const caveat = localFont({ src: "../fonts/marketing/caveat.woff2" })
`

// The author-only marketing font module (web/next/src/lib/marketing/fonts.ts), wholesale fork-excluded.
const MARKETING_FONTS = `import localFont from "next/font/local"

export const caveat = localFont({ src: "../../fonts/marketing/caveat.woff2" })
`

const NAV = `export const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/hire", label: "Hire" },
]
`

const fonts = () => readFileSync(join(dir, "web/next/src/lib/fonts.ts"), "utf8")
const nav = () => readFileSync(join(dir, "web/next/src/components/common/navbar.tsx"), "utf8")

describe("fixDangling", () => {
  const setup = (f: string, n: string) => {
    write(join(dir, "web/next/src/lib/fonts.ts"), f)
    write(join(dir, "web/next/src/components/common/navbar.tsx"), n)
  }

  test("strips the /hire link, keeps other links and a clean fonts.ts", () => {
    setup(FONTS, NAV)
    fixDangling(dir)
    expect(fonts()).toContain("dmSans")
    expect(nav()).not.toContain("/hire")
    expect(nav()).toContain("/dashboard")
  })

  test("is resilient to nav reformatting (single quotes, minified entry)", () => {
    setup(FONTS, `export const links = [\n  {href:'/hire',label:'Hire'},\n]\n`)
    expect(() => fixDangling(dir)).not.toThrow()
    expect(nav()).not.toContain("/hire")
  })

  test("strips CRLF-terminated /hire (Windows/WSL checkout)", () => {
    const crlf = (s: string) => s.replace(/\n/g, "\r\n")
    setup(crlf(FONTS), crlf(NAV))
    expect(() => fixDangling(dir)).not.toThrow()
    expect(nav()).not.toContain("/hire")
  })

  test("throws when a marketing font leaked back into the shared fonts.ts", () => {
    setup(FONTS_LEAKED, NAV)
    expect(() => fixDangling(dir)).toThrow(/fonts\.ts/)
  })

  test("throws when the marketing font module survived the fork strip", () => {
    setup(FONTS, NAV)
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    expect(() => fixDangling(dir)).toThrow(/lib\/marketing/)
  })

  // #749: that leak check is an init invariant. web/next/src/lib/marketing/ is fork-excluded, so on sync a module there is the fork's own, and every fork that follows the placement rule was tripping it.
  test("accepts a marketing font module the fork already owned before the overlay", () => {
    setup(FONTS, NAV)
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    expect(() => fixDangling(dir, true)).not.toThrow()
    expect(exists(join(dir, "web/next/src/lib/marketing/fonts.ts"))).toBe(true)
  })

  test("still catches a leaked shared fonts.ts even when the fork owns a marketing module", () => {
    setup(FONTS_LEAKED, NAV)
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    // the leak-specific message, not just /fonts\.ts/, which the survived-the-strip throw also matches and would pass even if the flag were ignored
    expect(() => fixDangling(dir, true)).toThrow(/references fonts\/marketing\//)
  })

  test("no-ops when the starter already dropped /hire (evolution)", () => {
    setup(FONTS, `export const links = [\n    { href: "/dashboard", label: "Dash" },\n]\n`)
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).toContain("dmSans")
    expect(nav()).toContain("/dashboard")
  })
})

describe("convertRepo (in-place)", () => {
  const scaffold = () => {
    write(
      join(dir, ".gitpickignore"),
      [
        "# custom",
        "LICENSE.md",
        "web/next/content/",
        "web/next/src/lib/marketing/",
        "packages/config/src/site.ts",
        "# PRESERVE_ON_SYNC - bun.lock",
      ].join("\n"),
    )
    write(join(dir, "LICENSE.md"), "MIT")
    write(join(dir, "web/next/content/old.mdx"), "author-only")
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    write(join(dir, "packages/config/src/site.ts"), "// upstream site")
    write(
      join(dir, "package.json"),
      JSON.stringify({
        name: "zerostarter",
        version: "1.2.3",
        author: "nrjdalal",
        homepage: "https://zerostarter.dev",
        license: "MIT",
      }),
    )
    write(join(dir, "web/next/src/lib/fonts.ts"), FONTS)
    write(join(dir, "web/next/src/components/common/navbar.tsx"), NAV)
    write(
      join(dir, "web/next/package.json"),
      JSON.stringify({ name: "@web/next", portless: { name: "zerostarter", script: "dev:app" } }),
    )
    write(
      join(dir, "api/hono/package.json"),
      JSON.stringify({
        name: "@api/hono",
        portless: { name: "api.zerostarter", script: "dev:app" },
      }),
    )
  }

  test("removes the excluded paths and the ignore file itself", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    expect(exists(join(dir, "LICENSE.md"))).toBe(false)
    expect(exists(join(dir, ".gitpickignore"))).toBe(false)
    expect(exists(join(dir, "web/next/content/old.mdx"))).toBe(false)
    expect(exists(join(dir, "web/next/src/lib/marketing/fonts.ts"))).toBe(false)
  })

  // The ledger is per-fork state: a fork that received the starter's would read every skill as untracked and lose the edits sync is meant to preserve. Guards the shipped .gitpickignore, not a fixture, since that file is what gitpick actually reads.
  test("never carries a starter sync ledger into the fork", () => {
    const shipped = readFileSync(join(import.meta.dir, "../../../../.gitpickignore"), "utf8")
    expect(shipped).toContain(SKILL_LEDGER)
    scaffold()
    write(join(dir, ".gitpickignore"), shipped)
    write(join(dir, SKILL_LEDGER), '{"stale":{"upstream":"deadbeefdead","written":"deadbeefdead"}}')
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n",
    )
    convertRepo(dir, { name: "acme" })
    const ledger = JSON.parse(read(join(dir, SKILL_LEDGER)))
    expect(ledger.stale).toBeUndefined()
    expect(ledger.dev.written).toMatch(/^[0-9a-f]{12}$/)
  })

  test("throws on a non-literal (glob) .gitpickignore entry", () => {
    write(join(dir, ".gitpickignore"), "# custom\n*.log\n")
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/literal path/)
  })

  // An in-place convert reads the checkout's own .gitpickignore, so a crafted one must not reach past the root.
  test("refuses an exclude that climbs out of the project, and removes nothing", () => {
    scaffold()
    const outside = mkdtempSync(join(tmpdir(), "zs-outside-"))
    try {
      write(join(outside, "victim.txt"), "keep")
      write(join(dir, ".gitpickignore"), `../${basename(outside)}/victim.txt\nLICENSE.md\n`)
      expect(() => convertRepo(dir, { name: "acme" })).toThrow(/not inside the project/)
      expect(exists(join(outside, "victim.txt"))).toBe(true)
      expect(exists(join(dir, "LICENSE.md"))).toBe(true)
    } finally {
      rmSync(outside, { force: true, recursive: true })
    }
  })

  test("refuses an absolute exclude", () => {
    scaffold()
    const outside = mkdtempSync(join(tmpdir(), "zs-outside-"))
    try {
      write(join(outside, "victim.txt"), "keep")
      write(join(dir, ".gitpickignore"), `${join(outside, "victim.txt")}\n`)
      expect(() => convertRepo(dir, { name: "acme" })).toThrow(/not inside the project/)
      expect(exists(join(outside, "victim.txt"))).toBe(true)
    } finally {
      rmSync(outside, { force: true, recursive: true })
    }
  })

  test("refuses an exclude that names the root itself", () => {
    scaffold()
    write(join(dir, ".gitpickignore"), ".\n")
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/not inside the project/)
    expect(exists(join(dir, "package.json"))).toBe(true)
    write(join(dir, ".gitpickignore"), "web/next/../..\n")
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/not inside the project/)
    expect(exists(join(dir, "package.json"))).toBe(true)
  })

  test("rebrands package.json to the fork name and drops author fields", () => {
    scaffold()
    convertRepo(dir, { name: "Acme App" })
    const pkg = readJson<Record<string, unknown>>(join(dir, "package.json"))
    expect(pkg.name).toBe("acme-app")
    expect(pkg.version).toBe("0.0.0")
    expect(pkg.author).toBeUndefined()
    expect(pkg.homepage).toBeUndefined()
    expect(pkg.license).toBeUndefined()
  })

  test("rebrands the portless dev-URL names in the app workspaces", () => {
    scaffold()
    convertRepo(dir, { name: "Acme App" })
    const web = readJson<{ portless: { name: string } }>(join(dir, "web/next/package.json"))
    const api = readJson<{ portless: { name: string } }>(join(dir, "api/hono/package.json"))
    expect(web.portless.name).toBe("acme-app")
    expect(api.portless.name).toBe("api.acme-app")
  })

  test("throws when an app package.json lost its portless config (drift)", () => {
    scaffold()
    write(join(dir, "web/next/package.json"), JSON.stringify({ name: "@web/next" }))
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/portless/)
  })

  test("throws when an app's portless config is not a plain object (array)", () => {
    scaffold()
    write(join(dir, "web/next/package.json"), JSON.stringify({ name: "@web/next", portless: [] }))
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/portless/)
  })

  test("writes a fresh branded site.ts and content stubs with no upstream identity", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    const site = read(join(dir, "packages/config/src/site.ts"))
    expect(site).toContain('name: "Acme"')
    expect(site).not.toContain("upstream site")
    expect(exists(join(dir, "web/next/content/docs/index.mdx"))).toBe(true)
    expect(exists(join(dir, "AGENTS.md"))).toBe(true)
    expect(read(join(dir, "README.md"))).not.toContain("nrjdalal")
  })

  test("writes the chosen feature flags into site.ts", () => {
    scaffold()
    convertRepo(
      dir,
      { name: "acme" },
      {
        allowlist: false,
        apiDocs: true,
        blog: false,
        docs: true,
        internalDocs: true,
        waitlist: true,
      },
    )
    const site = read(join(dir, "packages/config/src/site.ts"))
    expect(site).toContain("export const features")
    expect(site).toContain("blog: false")
    expect(site).toContain("waitlist: true")
  })

  test("reconciles the dangling /hire link and removes the marketing font module", () => {
    scaffold()
    convertRepo(dir, { name: "acme" })
    expect(exists(join(dir, "web/next/src/lib/marketing/fonts.ts"))).toBe(false)
    expect(fonts()).toContain("dmSans")
    expect(nav()).not.toContain("/hire")
  })

  test("reconciles an inherited skill: renames the identity, sets source, stamps the sync note", () => {
    scaffold()
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n\nRun `bunx portless get zerostarter`.\n",
    )
    convertRepo(dir, { name: "Acme App" })
    const skill = read(join(dir, ".agents/skills/dev/SKILL.md"))
    expect(skill).toContain("source: https://github.com/nrjdalal/zerostarter")
    expect(skill).toContain("[!CAUTION]")
    expect(skill).toContain("Start the Acme App dev stack")
    expect(skill).toContain("portless get acme-app")
    expect(skill).not.toContain("get zerostarter")
  })

  test("keeps a vendored skill's tool as its source, so the fork re-vendors it the same way", () => {
    scaffold()
    write(
      join(dir, ".agents/skills/agent-browser/SKILL.md"),
      "---\nname: agent-browser\ndescription: Browser automation CLI for AI agents.\nsource: agent-browser\n---\n\n# Agent Browser\n",
    )
    convertRepo(dir, { name: "acme" })
    const skill = read(join(dir, ".agents/skills/agent-browser/SKILL.md"))
    expect(skill).toContain("source: agent-browser")
    expect(skill).not.toContain("source: https://github.com/nrjdalal/zerostarter")
    // The note means "zerostarter syncs this"; a vendored skill is re-synced by re-running its own tool.
    expect(skill).not.toContain("[!CAUTION]")
  })

  test("records what it wrote in the sync ledger", () => {
    scaffold()
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n",
    )
    convertRepo(dir, { name: "acme" })
    const ledger = JSON.parse(read(join(dir, SKILL_LEDGER)))
    expect(ledger.dev.upstream).toMatch(/^[0-9a-f]{12}$/)
    expect(ledger.dev.written).toMatch(/^[0-9a-f]{12}$/)
    expect(ledger.dev.upstream).not.toBe(ledger.dev.written)
  })
})

// Sync merges the starter's app manifests over the fork's, which carries the starter's portless names back in; without re-applying them a synced fork serves zerostarter.localhost again.
describe("rebrandPortlessFromRoot (sync path)", () => {
  const appPkgs = (name: string, api: string) => {
    write(join(dir, "web/next/package.json"), JSON.stringify({ portless: { name } }))
    write(join(dir, "api/hono/package.json"), JSON.stringify({ portless: { name: api } }))
  }
  const portlessName = (rel: string) =>
    readJson<{ portless: { name: string } }>(join(dir, rel, "package.json")).portless.name

  test("restores the fork's dev-URL names after a merge brought the starter's back", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    appPkgs("zerostarter", "api.zerostarter")
    rebrandPortlessFromRoot(dir)
    expect(portlessName("web/next")).toBe("acme-app")
    expect(portlessName("api/hono")).toBe("api.acme-app")
  })

  test("no-ops when the root package.json has no name", () => {
    write(join(dir, "package.json"), JSON.stringify({ version: "1.0.0" }))
    appPkgs("zerostarter", "api.zerostarter")
    expect(() => rebrandPortlessFromRoot(dir)).not.toThrow()
    expect(portlessName("web/next")).toBe("zerostarter")
  })
})
