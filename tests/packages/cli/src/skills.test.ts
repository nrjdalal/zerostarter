import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { read, write } from "../../../../packages/cli/src/io"
import {
  reconcileForkSkillsFromRoot,
  SKILL_LEDGER,
  SKILL_REF,
  snapshotSkills,
} from "../../../../packages/cli/src/skills"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-skills-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
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

    // #750 asks sync to skip any skill whose source is not this repo. A tool name is not this repo,
    // so a vendored skill is the fork's to re-vendor: its body must survive, not only its source line.
    test("leaves a tool-vendored skill alone, body and all", () => {
      forkPkg()
      const file = join(dir, ".agents/skills/portless/SKILL.md")
      write(
        file,
        "---\nname: portless\ndescription: A skill.\nsource: portless\n---\n\n# Portless\n\nThe fork's vendored copy.\n",
      )
      const before = snapshotSkills(dir)
      overlaid("portless", "portless", "# Portless\n\nUpstream's newer copy.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      const skill = read(file)
      expect(skill).toContain("The fork's vendored copy.")
      expect(skill).not.toContain("Upstream's newer copy.")
      expect(skill).toContain("source: portless")
      expect(result.forkOwned).toContain("portless")
      expect(result.adopted).not.toContain("portless")
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

    // skills-manager accepts an owner/repo shorthand as upstream provenance, so the CLI must read it as the same upstream; treating it as a foreign repo would freeze that skill forever.
    test("reads an owner/repo shorthand source as this upstream, not a foreign one", () => {
      forkPkg()
      overlaid("dev", "local", "# Dev\n\nOriginal.\n")
      reconcileForkSkillsFromRoot(dir)
      const file = join(dir, ".agents/skills/dev/SKILL.md")
      write(
        file,
        read(file).replace(
          "source: https://github.com/nrjdalal/zerostarter",
          "source: nrjdalal/zerostarter",
        ),
      )
      const before = snapshotSkills(dir)
      overlaid("dev", "local", "# Dev\n\nRevised upstream.\n")
      const result = reconcileForkSkillsFromRoot(dir, before)
      expect(result.forkOwned).toEqual([])
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

// #751's other half: the CLI syncs a fork from main, but this repo's default branch is canary, so
// comparing --outdated against canary would report every skill canary is ahead on as drifted.
describe("the sync ledger", () => {
  const overlaid = (name: string, source: string, body: string) =>
    write(
      join(dir, `.agents/skills/${name}/SKILL.md`),
      `---\nname: ${name}\ndescription: A skill.\nsource: ${source}\n---\n\n${body}`,
    )

  test("records the ref each entry was synced from", () => {
    write(join(dir, "package.json"), JSON.stringify({ name: "acme-app" }))
    overlaid("dev", "local", "# Dev\n")
    reconcileForkSkillsFromRoot(dir)
    const ledger = JSON.parse(read(join(dir, SKILL_LEDGER)))
    expect(ledger.dev.ref).toBe(SKILL_REF)
    expect(SKILL_REF).toBe("main")
  })

  // The CLI and .github/scripts/skills-manager.ts hash the ledger independently (a fork ships no
  // packages/cli to import), so a one-sided edit would make every skill silently read as untracked.
  // Whitespace is stripped rather than matched, which keeps this insensitive to how either file is
  // formatted and to the CRLF a Windows checkout brings, the very thing the hash normalizes away.
  test("hashes identically to the maintainer script", async () => {
    const strip = (s: string) => s.replace(/\s+/g, "")
    const pipeline = strip(
      `createHash("sha256").update(text.replace(/\\r\\n/g, "\\n")).digest("hex").slice(0, 12)`,
    )
    const source = async (rel: string) => strip(await Bun.file(join(import.meta.dir, rel)).text())
    expect(await source("../../../../packages/cli/src/skills.ts")).toContain(pipeline)
    expect(await source("../../../../.github/scripts/skills-manager.ts")).toContain(pipeline)
  })
})
