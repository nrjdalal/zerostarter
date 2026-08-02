import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  convertRepo,
  fixDangling,
  rebrandPortlessFromRoot,
} from "../../../../packages/cli/src/convert"
import { exists, read, readJson, write } from "../../../../packages/cli/src/io"
import {
  reconcileForkSkillsFromRoot,
  SKILL_LEDGER,
  snapshotSkills,
} from "../../../../packages/cli/src/skills"

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
    expect(() => fixDangling(dir, true)).toThrow(/fonts\.ts/)
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

  // #750: a sync overlay rewrote every skill regardless of provenance, deleting fork customizations and stamping local and vendored skills as synced from upstream.
  describe("preserves what the fork owns", () => {
    const forkPkg = () => write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))

    // Upstream's copy, as the overlay leaves it on disk just before reconcile runs.
    const overlaid = (name: string, source = "local", body = "# Body\n") =>
      write(
        join(dir, `.agents/skills/${name}/SKILL.md`),
        `---\nname: ${name}\ndescription: A skill.\nsource: ${source}\n---\n\n${body}`,
      )

    test("leaves a fork-authored skill alone instead of claiming it came from upstream", () => {
      forkPkg()
      overlaid("vendor", "local", "# Vendor\n\nAcme wrote this.\n")
      const before = snapshotSkills(dir)
      // the fork authored it, so its committed copy says source: local and carries no sync note
      write(
        join(dir, ".agents/skills/vendor/SKILL.md"),
        "---\nname: vendor\ndescription: A skill.\nsource: local\n---\n\n# Vendor\n\nAcme wrote this.\n",
      )
      const result = reconcileForkSkillsFromRoot(dir, before)
      const skill = read(join(dir, ".agents/skills/vendor/SKILL.md"))
      expect(skill).toContain("source: local")
      expect(skill).not.toContain("nrjdalal/zerostarter")
      expect(skill).not.toContain("[!CAUTION]")
      expect(result.forkOwned).toContain("vendor")
      expect(JSON.parse(read(join(dir, SKILL_LEDGER))).vendor).toBeUndefined()
    })

    test("keeps a customized body and names the skill rather than silently overwriting it", () => {
      forkPkg()
      overlaid("design", "local", "# Design\n\nUpstream guidance.\n")
      reconcileForkSkillsFromRoot(dir)
      const file = join(dir, ".agents/skills/design/SKILL.md")
      write(file, `${read(file)}\n## Acme brand\n\nBrand color is oklch(0.62 0.19 29).\n`)
      const before = snapshotSkills(dir)
      overlaid("design", "local", "# Design\n\nUpstream guidance, revised.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(read(file)).toContain("Acme brand")
      expect(read(file)).not.toContain("revised")
      expect(result.customized).toEqual(["design"])
    })

    test("takes the update when the fork has not touched the skill", () => {
      forkPkg()
      overlaid("dev", "local", "# Dev\n\nOriginal.\n")
      reconcileForkSkillsFromRoot(dir)
      const before = snapshotSkills(dir)
      overlaid("dev", "local", "# Dev\n\nRevised upstream.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(read(join(dir, ".agents/skills/dev/SKILL.md"))).toContain("Revised upstream")
      expect(result.adopted).toContain("dev")
      expect(result.customized).toEqual([])
    })

    test("treats a dropped sync note as the fork taking ownership", () => {
      forkPkg()
      overlaid("audit", "local", "# Audit\n\nOriginal.\n")
      reconcileForkSkillsFromRoot(dir)
      const file = join(dir, ".agents/skills/audit/SKILL.md")
      write(file, read(file).replace(/> \[!CAUTION\][\s\S]*?stop syncing\.\n\n/, ""))
      const before = snapshotSkills(dir)
      overlaid("audit", "local", "# Audit\n\nRevised upstream.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(read(file)).not.toContain("[!CAUTION]")
      expect(read(file)).not.toContain("Revised upstream")
      expect(result.forkOwned).toContain("audit")
    })

    // A fork last synced before the ledger existed has no entry to compare, so an untouched skill must still be recognised, including one the older CLI stamped as synced from upstream even though it is vendored.
    test("adopts an untouched skill from a fork that predates the ledger, silently", () => {
      forkPkg()
      const file = join(dir, ".agents/skills/portless/SKILL.md")
      // the fork as the older CLI left it: stamped as synced from upstream even though it is vendored
      write(
        file,
        "---\nname: portless\ndescription: A skill.\nsource: https://github.com/nrjdalal/zerostarter\n---\n\n" +
          "> [!CAUTION]\n> Synced from https://github.com/nrjdalal/zerostarter. Customize this skill or remove this note to stop syncing.\n\n" +
          "# Portless\n\nOriginal.\n",
      )
      const before = snapshotSkills(dir)
      // then the overlay drops upstream's own copy on top, unchanged since that sync
      overlaid("portless", "portless", "# Portless\n\nOriginal.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(read(file)).toContain("source: portless")
      expect(result.adopted).toContain("portless")
      expect(result.unverified).toEqual([])
    })

    // Without a record there is no telling an edit here from upstream moving. Preserving on that ambiguity would freeze every pre-ledger fork's skills, so the update lands and the skill is named for review.
    test("takes the update but names an unrecognised skill from a pre-ledger fork", () => {
      forkPkg()
      overlaid("portless", "portless", "# Portless\n\nOriginal.\n")
      reconcileForkSkillsFromRoot(dir)
      const file = join(dir, ".agents/skills/portless/SKILL.md")
      write(
        file,
        "---\nname: portless\ndescription: A skill.\nsource: https://github.com/nrjdalal/zerostarter\n---\n\n" +
          "> [!CAUTION]\n> Synced from https://github.com/nrjdalal/zerostarter. Customize this skill or remove this note to stop syncing.\n\n" +
          "# Portless\n\nOriginal.\n",
      )
      rmSync(join(dir, SKILL_LEDGER), { force: true })
      const before = snapshotSkills(dir)
      overlaid("portless", "portless", "# Portless\n\nRevised upstream.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(read(file)).toContain("Revised upstream")
      expect(read(file)).toContain("source: portless")
      expect(result.adopted).toContain("portless")
      expect(result.unverified).toEqual(["portless"])
      // and it is tracked from here on, so the next sync can tell an edit from an update
      expect(JSON.parse(read(join(dir, SKILL_LEDGER))).portless.written).toMatch(/^[0-9a-f]{12}$/)
    })
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
