import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { convertRepo, fixDangling } from "../../../../packages/cli/src/convert"
import { exists, read, readJson, write } from "../../../../packages/cli/src/io"
import { reconcileForkSkillsFromRoot } from "../../../../packages/cli/src/skills"

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

describe("reconcileForkSkillsFromRoot (sync path)", () => {
  const devSkill = (dir: string) =>
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n\nRun `bunx portless get zerostarter`.\n",
    )

  test("rebrands overlaid skills from the fork's package.json name", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    devSkill(dir)
    reconcileForkSkillsFromRoot(dir)
    const skill = read(join(dir, ".agents/skills/dev/SKILL.md"))
    expect(skill).toContain("source: https://github.com/nrjdalal/zerostarter")
    expect(skill).toContain("[!CAUTION]")
    expect(skill).toContain("Start the acme-app dev stack")
    expect(skill).toContain("portless get acme-app")
    expect(skill).not.toContain("ZeroStarter")
    expect(skill).not.toContain("get zerostarter")
    // The upstream URL in the source line and sync note must NOT be rebranded to the fork.
    expect(skill).toContain("Synced from https://github.com/nrjdalal/zerostarter")
    expect(skill).not.toContain("nrjdalal/acme-app")
  })

  test("no-ops when the root package.json has no name", () => {
    write(join(dir, "package.json"), JSON.stringify({ version: "1.0.0" }))
    devSkill(dir)
    expect(() => reconcileForkSkillsFromRoot(dir)).not.toThrow()
    expect(read(join(dir, ".agents/skills/dev/SKILL.md"))).toContain("ZeroStarter")
  })

  test("keeps upstream refs (bunx zerostarter, scaffolding CLI) but rebrands fork identity", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    write(
      join(dir, ".agents/skills/codebase-map/SKILL.md"),
      "---\nname: codebase-map\ndescription: Orient in the repo.\nsource: local\n---\n\n" +
        "Sync with `bunx zerostarter sync`; `packages/cli/` is the zerostarter scaffolding CLI.\n" +
        "Dev URL `bunx portless get zerostarter`, api `api.zerostarter`, image `zerostarter-web`.\n",
    )
    reconcileForkSkillsFromRoot(dir)
    const skill = read(join(dir, ".agents/skills/codebase-map/SKILL.md"))
    expect(skill).toContain("bunx zerostarter sync")
    expect(skill).toContain("zerostarter scaffolding CLI")
    expect(skill).toContain("portless get acme-app")
    expect(skill).toContain("api.acme-app")
    expect(skill).toContain("acme-app-web")
  })
})
