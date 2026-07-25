import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { assertMarketingStripped, convertRepo, fixDangling } from "@/convert"
import { exists, read, readJson, write } from "@/io"
import { syncForkSkills } from "@/skills"

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

  test("tolerates a fork-owned marketing font module (sync path)", () => {
    setup(FONTS, NAV)
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    expect(() => fixDangling(dir)).not.toThrow()
    expect(nav()).not.toContain("/hire")
  })

  test("no-ops when the starter already dropped /hire (evolution)", () => {
    setup(FONTS, `export const links = [\n    { href: "/dashboard", label: "Dash" },\n]\n`)
    expect(() => fixDangling(dir)).not.toThrow()
    expect(fonts()).toContain("dmSans")
    expect(nav()).toContain("/dashboard")
  })
})

describe("assertMarketingStripped (init/reinit only)", () => {
  test("throws when the marketing font module survived the fork strip", () => {
    write(join(dir, "web/next/src/lib/marketing/fonts.ts"), MARKETING_FONTS)
    expect(() => assertMarketingStripped(dir)).toThrow(/lib\/marketing/)
  })

  test("passes when the module was stripped", () => {
    expect(() => assertMarketingStripped(dir)).not.toThrow()
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

  test("throws on a non-literal (glob) .gitpickignore entry", () => {
    write(join(dir, ".gitpickignore"), "# custom\n*.log\n")
    expect(() => convertRepo(dir, { name: "acme" })).toThrow(/literal path/)
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
    expect(skill).toMatch(/source-hash: "[0-9a-f]{16}"/)
    expect(skill).toMatch(/synced-hash: "[0-9a-f]{16}"/)
  })

  test("re-points a vendored skill's source at upstream (a fork inherits it through zerostarter, not the tool)", () => {
    scaffold()
    write(
      join(dir, ".agents/skills/agent-browser/SKILL.md"),
      "---\nname: agent-browser\ndescription: Browser automation CLI for AI agents.\nsource: agent-browser\n---\n\n# Agent Browser\n",
    )
    convertRepo(dir, { name: "acme" })
    const skill = read(join(dir, ".agents/skills/agent-browser/SKILL.md"))
    expect(skill).toContain("source: https://github.com/nrjdalal/zerostarter")
    expect(skill).not.toContain("source: agent-browser")
    expect(skill).toContain("[!CAUTION]")
  })
})

describe("syncForkSkills (sync path)", () => {
  const UPSTREAM_DEV =
    "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n\nRun `bunx portless get zerostarter`.\n"
  const skillPath = () => join(dir, ".agents/skills/dev/SKILL.md")

  // Simulate the state a previous sync left in the fork: the raw upstream skill transformed and stamped.
  const previousSync = (raw: string): string => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    write(skillPath(), raw)
    syncForkSkills(dir, new Map())
    return read(skillPath())
  }

  test("adds a new upstream skill: rebrands, sets source, stamps the note and drift hashes", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    write(skillPath(), UPSTREAM_DEV)
    const result = syncForkSkills(dir, new Map())
    expect(result.added).toEqual(["dev"])
    const skill = read(skillPath())
    expect(skill).toContain("source: https://github.com/nrjdalal/zerostarter")
    expect(skill).toContain("[!CAUTION]")
    expect(skill).toContain("Start the acme-app dev stack")
    expect(skill).toContain("portless get acme-app")
    expect(skill).not.toContain("ZeroStarter")
    expect(skill).not.toContain("get zerostarter")
    expect(skill).toMatch(/source-hash: "[0-9a-f]{16}"/)
    expect(skill).toMatch(/synced-hash: "[0-9a-f]{16}"/)
    // The upstream URL in the source line and sync note must NOT be rebranded to the fork.
    expect(skill).toContain("Synced from https://github.com/nrjdalal/zerostarter")
    expect(skill).not.toContain("nrjdalal/acme-app")
  })

  test("no-ops when the root package.json has no name", () => {
    write(join(dir, "package.json"), JSON.stringify({ version: "1.0.0" }))
    write(skillPath(), UPSTREAM_DEV)
    expect(() => syncForkSkills(dir, new Map())).not.toThrow()
    expect(read(skillPath())).toContain("ZeroStarter")
  })

  test("keeps upstream refs (bunx zerostarter, scaffolding CLI) but rebrands fork identity", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    write(
      join(dir, ".agents/skills/codebase-map/SKILL.md"),
      "---\nname: codebase-map\ndescription: Orient in the repo.\nsource: local\n---\n\n" +
        "Sync with `bunx zerostarter sync`; `packages/cli/` is the zerostarter scaffolding CLI.\n" +
        "Dev URL `bunx portless get zerostarter`, api `api.zerostarter`, image `zerostarter-web`.\n",
    )
    syncForkSkills(dir, new Map())
    const skill = read(join(dir, ".agents/skills/codebase-map/SKILL.md"))
    expect(skill).toContain("bunx zerostarter sync")
    expect(skill).toContain("zerostarter scaffolding CLI")
    expect(skill).toContain("portless get acme-app")
    expect(skill).toContain("api.acme-app")
    expect(skill).toContain("acme-app-web")
  })

  test("updates an uncustomized synced skill when upstream advances", () => {
    const pre = previousSync(UPSTREAM_DEV)
    write(skillPath(), UPSTREAM_DEV.replace("# Dev", "# Dev\n\nNow with turbo."))
    const result = syncForkSkills(dir, new Map([["dev", pre]]))
    expect(result.updated).toEqual(["dev"])
    const skill = read(skillPath())
    expect(skill).toContain("Now with turbo.")
    expect(skill).toContain("[!CAUTION]")
    expect(skill).toMatch(/synced-hash: "[0-9a-f]{16}"/)
  })

  test("skips a synced skill the fork customized (synced-hash mismatch)", () => {
    const customized = `${previousSync(UPSTREAM_DEV)}\nFork-only bullet.\n`
    write(skillPath(), UPSTREAM_DEV.replace("# Dev", "# Dev v2"))
    const result = syncForkSkills(dir, new Map([["dev", customized]]))
    expect(result.skipped).toEqual(["dev"])
    expect(read(skillPath())).toBe(customized)
  })

  test("skips a synced skill whose sync note was removed", () => {
    const owned = previousSync(UPSTREAM_DEV).replace(/> \[!CAUTION\]\n> Synced from[^\n]*\n\n/, "")
    write(skillPath(), UPSTREAM_DEV)
    const result = syncForkSkills(dir, new Map([["dev", owned]]))
    expect(result.skipped).toEqual(["dev"])
    expect(read(skillPath())).toBe(owned)
  })

  test("restores a skill with non-upstream provenance instead of restamping it", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    const path = join(dir, ".agents/skills/agent-browser/SKILL.md")
    const vendored =
      "---\nname: agent-browser\ndescription: Browser automation CLI for AI agents.\nsource: agent-browser\n---\n\n# Agent Browser\n"
    write(path, vendored.replace("# Agent Browser", "# Agent Browser (upstream edit)"))
    const result = syncForkSkills(dir, new Map([["agent-browser", vendored]]))
    expect(result.kept).toEqual(["agent-browser"])
    expect(read(path)).toBe(vendored)
  })

  test("overwrites but names a note-intact skill with no drift stamp (pre-stamp fork)", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    const prestamp =
      "---\nname: dev\ndescription: Start the acme-app dev stack.\nsource: https://github.com/nrjdalal/zerostarter\n---\n\n> [!CAUTION]\n> Synced from https://github.com/nrjdalal/zerostarter. Customize this skill or remove this note to stop syncing.\n\n# Dev\n"
    write(skillPath(), UPSTREAM_DEV)
    const result = syncForkSkills(dir, new Map([["dev", prestamp]]))
    expect(result.unverified).toEqual(["dev"])
    expect(read(skillPath())).toMatch(/synced-hash: "[0-9a-f]{16}"/)
  })

  test("leaves a fork-only skill alone (the overlay never touched it)", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    const path = join(dir, ".agents/skills/vendor/SKILL.md")
    const forkOnly =
      "---\nname: vendor\ndescription: Vendor a dep.\nsource: local\n---\n\n# Vendor\n"
    write(path, forkOnly)
    const result = syncForkSkills(dir, new Map([["vendor", forkOnly]]))
    expect(read(path)).toBe(forkOnly)
    expect(result.added).toEqual([])
    expect(result.kept).toEqual([])
  })
})
