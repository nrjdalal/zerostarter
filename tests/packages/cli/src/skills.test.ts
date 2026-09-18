import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { exists, read, write } from "../../../../packages/cli/src/io"
import {
  GUIDE,
  reconcileForkGuide,
  reconcileForkGuideFromRoot,
  reconcileForkSkillsFromRoot,
  SKILL_LEDGER,
  SKILL_REF,
  snapshotSkills,
} from "../../../../packages/cli/src/skills"
import { agentsTemplate } from "../../../../packages/cli/src/templates"

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

describe("the agent guide", () => {
  const tables = (custom: string) =>
    `**Custom**\n\n<!-- skills:custom -->\n${custom}\n<!-- /skills:custom -->\n\n**Vendored**\n\n<!-- skills:vendored -->\n\n<!-- /skills:vendored -->\n`
  const upstreamGuide = (rule: string) =>
    `# AGENTS.md\n\nGuidance for agents.\n\n- ALWAYS: ${rule}\n\n\`\`\`bash\nWEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)\n\`\`\`\n\nRun \`bunx zerostarter sync\` to update.\n\n${tables("| dev | Start the ZeroStarter dev stack. |")}`
  const guide = () => read(join(dir, GUIDE))
  const ledger = () => JSON.parse(read(join(dir, SKILL_LEDGER)))
  const named = (name = "acme-app") => write(join(dir, "package.json"), JSON.stringify({ name }))

  test("init rebrands the guide the starter ships and records it", () => {
    write(join(dir, GUIDE), upstreamGuide("Use worktrees."))
    expect(reconcileForkGuide(dir, { name: "Acme App" })).toBe("adopted")
    expect(guide()).toContain("- ALWAYS: Use worktrees.")
    expect(guide()).toContain("bunx portless get acme-app")
    expect(guide()).toContain("bunx portless get api.acme-app")
    expect(guide()).toContain("Start the Acme App dev stack")
    // the CLI a fork still runs keeps its upstream name
    expect(guide()).toContain("bunx zerostarter sync")
    expect(ledger()[GUIDE].ref).toBe(SKILL_REF)
  })

  test("init falls back to the stub when the starter ref ships no guide, and records it so a later sync upgrades it", () => {
    expect(reconcileForkGuide(dir, { name: "acme" })).toBe("adopted")
    expect(guide()).toBe(agentsTemplate())
    expect(ledger()[GUIDE]).toBeDefined()
  })

  test("the skills pass, which rebuilds the ledger, carries the guide's entry across", () => {
    named()
    write(join(dir, GUIDE), upstreamGuide("Use worktrees."))
    reconcileForkGuide(dir, { name: "acme-app" })
    const entry = ledger()[GUIDE]
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: A skill.\nsource: local\n---\n\n# Dev\n",
    )
    reconcileForkSkillsFromRoot(dir)
    expect(ledger()[GUIDE]).toEqual(entry)
    expect(ledger().dev).toBeDefined()
  })

  describe("on sync", () => {
    const scaffolded = (rule: string) => {
      named()
      write(join(dir, GUIDE), upstreamGuide(rule))
      reconcileForkGuide(dir, { name: "acme-app" })
      return guide()
    }

    test("takes the update while the fork has not touched the guide", () => {
      const before = scaffolded("Use worktrees.")
      const result = reconcileForkGuideFromRoot(dir, {
        before,
        upstream: upstreamGuide("Use worktrees, always."),
      })
      expect(result).toBe("adopted")
      expect(guide()).toContain("Use worktrees, always.")
      expect(guide()).toContain("bunx portless get acme-app")
    })

    // The fork's own skills-manager fills these tables after the CLI writes the file, and they change whenever the fork adds a skill. Counting that as an edit would freeze every fork's guide on its first commit.
    test("does not read the generated skills tables as an edit", () => {
      const written = scaffolded("Use worktrees.")
      const before = written.replace(
        /(<!-- skills:custom -->)[\s\S]*?(<!-- \/skills:custom -->)/,
        "$1\n| dev | Start it. |\n| mine | A skill the fork added. |\n$2",
      )
      expect(before).not.toBe(written)
      expect(
        reconcileForkGuideFromRoot(dir, { before, upstream: upstreamGuide("A new rule.") }),
      ).toBe("adopted")
      expect(guide()).toContain("A new rule.")
    })

    test("keeps a guide the fork has edited, and says so", () => {
      const before = scaffolded("Use worktrees.").replace(
        "Guidance for agents.",
        "Our house rules.",
      )
      write(join(dir, GUIDE), upstreamGuide("A new rule."))
      expect(
        reconcileForkGuideFromRoot(dir, { before, upstream: upstreamGuide("A new rule.") }),
      ).toBe("customized")
      expect(guide()).toBe(before)
    })

    test("a CRLF checkout of an untouched guide is not an edit", () => {
      const before = scaffolded("Use worktrees.").replace(/\n/g, "\r\n")
      expect(
        reconcileForkGuideFromRoot(dir, { before, upstream: upstreamGuide("A new rule.") }),
      ).toBe("adopted")
    })

    test("upgrades the untouched stub an older CLI scaffolded, tables filled or not", () => {
      named()
      const before = agentsTemplate().replace(
        "<!-- skills:custom -->\n",
        "<!-- skills:custom -->\n\n| dev | Start it. |\n",
      )
      expect(before).not.toBe(agentsTemplate())
      expect(
        reconcileForkGuideFromRoot(dir, { before, upstream: upstreamGuide("Use worktrees.") }),
      ).toBe("adopted")
      expect(guide()).toContain("Use worktrees.")
    })

    // Until now AGENTS.md was fork-excluded, so a guide with no sync record is the fork's own work. It is never replaced on a guess.
    test("never replaces a fork-written guide that has no sync record", () => {
      named()
      const before = "# AGENTS.md\n\nRules this fork wrote itself.\n"
      write(join(dir, GUIDE), upstreamGuide("Use worktrees."))
      expect(
        reconcileForkGuideFromRoot(dir, { before, upstream: upstreamGuide("Use worktrees.") }),
      ).toBe("forkOwned")
      expect(guide()).toBe(before)
      expect(exists(join(dir, SKILL_LEDGER)) ? ledger()[GUIDE] : undefined).toBeUndefined()
    })

    test("adopts the guide into a fork that has none", () => {
      named()
      expect(
        reconcileForkGuideFromRoot(dir, {
          before: undefined,
          upstream: upstreamGuide("Use worktrees."),
        }),
      ).toBe("adopted")
      expect(guide()).toContain("bunx portless get acme-app")
    })

    test("does nothing when the starter ref supplied no guide", () => {
      named()
      const before = "# AGENTS.md\n\nRules this fork wrote itself.\n"
      write(join(dir, GUIDE), before)
      expect(reconcileForkGuideFromRoot(dir, { before, upstream: before })).toBe("absent")
      expect(reconcileForkGuideFromRoot(dir, { before, upstream: undefined })).toBe("absent")
      expect(guide()).toBe(before)
    })
  })
})

describe("reconcile", () => {
  test("substitutes a brand name literally, so a $ in it is not a replacement pattern", () => {
    // "$&" would otherwise re-insert the matched "ZeroStarter" and "$'" the rest of the line.
    write(join(dir, "package.json"), JSON.stringify({ name: "Acme $& Co" }))
    write(
      join(dir, ".agents/skills/dev/SKILL.md"),
      "---\nname: dev\ndescription: Start the ZeroStarter dev stack.\nsource: local\n---\n\n# Dev\n\nZeroStarter runs here.\n",
    )
    reconcileForkSkillsFromRoot(dir)
    const skill = read(join(dir, ".agents/skills/dev/SKILL.md"))
    expect(skill).toContain("Start the Acme $& Co dev stack.")
    expect(skill).toContain("Acme $& Co runs here.")
    expect(skill).not.toContain("ZeroStarter")
  })
})
