import { createHash } from "node:crypto"
import { readdirSync } from "node:fs"
import { join } from "node:path"

import { exists, read, readJson, write, writeJson } from "@/io"
import { run } from "@/spawn"
import type { Brand } from "@/templates"

const UPSTREAM = "https://github.com/nrjdalal/zerostarter"

// What the CLI last wrote into this fork, per skill: the hash of the upstream file it came from (so the fork can tell it is behind) and of the file as written (so sync can tell the fork has edited it since). It sits beside the skills rather than in frontmatter, so a SKILL.md still carries provenance and nothing else.
export const SKILL_LEDGER = ".agents/skills/.sync.json"

export type SkillLedgerEntry = { upstream: string; written: string }
export type SkillLedger = Record<string, SkillLedgerEntry>

// What a reconcile did, so sync can name the skills it left alone (or took without proof) instead of folding them into "edits overwritten".
export type SkillReconcile = {
  adopted: string[]
  customized: string[]
  forkOwned: string[]
  unverified: string[]
}

const emptyReconcile = (): SkillReconcile => ({
  adopted: [],
  customized: [],
  forkOwned: [],
  unverified: [],
})

// Hash line-ending-normalized text: gitpick under core.autocrlf yields CRLF on Windows, and a fork must not read as edited over that alone.
const digest = (text: string): string =>
  createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12)

// npm-safe slug derived from the project name (shared with convert.ts's rebrand).
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "app"

// Rebrand the fork's own identity (display name, portless dev-URL names, docker image, log paths) while preserving upstream references: `bunx zerostarter` is the CLI a fork still runs to sync (it ships none of its own) and "zerostarter scaffolding CLI" names that upstream tool, so a lowercase "zerostarter" preceded by "bunx " or followed by " scaffolding CLI" is left alone. The frontmatter source line and sync note are stamped separately and never pass through here.
const reconcile = (text: string, slug: string, name: string): string =>
  text.replaceAll("ZeroStarter", name).replace(/(?<!bunx )zerostarter(?! scaffolding CLI)/g, slug)

// The line marking a skill as synced from here; its presence is the fork's opt-in, and removing it hands the skill to the fork.
const NOTE_MARKER = `> Synced from ${UPSTREAM}.`

const syncNote = (): string =>
  `> [!CAUTION]\n${NOTE_MARKER} Customize this skill or remove this note to stop syncing.`

// The frontmatter `source` value, or "" when the file carries no frontmatter.
const sourceOf = (text: string): string => {
  const lines = text.split("\n")
  if (lines[0] === undefined || lines[0].trim() !== "---") return ""
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break
    if (line.startsWith("source:")) return line.slice("source:".length).trim()
  }
  return ""
}

const skillDirs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && exists(join(dir, entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort()

const readLedger = (root: string): SkillLedger => {
  const path = join(root, SKILL_LEDGER)
  if (!exists(path)) return {}
  try {
    return readJson<SkillLedger>(path)
  } catch {
    return {}
  }
}

// The fork's skills as committed. Sync reads this before the overlay, which overwrites the very evidence of what the fork had customized.
export const snapshotSkills = (root: string): Map<string, string> => {
  const dir = join(root, ".agents/skills")
  const snapshot = new Map<string, string>()
  if (!exists(dir)) return snapshot
  for (const name of skillDirs(dir)) snapshot.set(name, read(join(dir, name, "SKILL.md")))
  return snapshot
}

// Render an upstream skill as the fork's copy: rebrand the prose, point source at the fork's provenance, and stamp the sync note. `asLegacy` reproduces what the pre-ledger CLI wrote, which stamped every skill as synced from here, vendored ones included.
const renderForkSkill = (
  upstream: string,
  slug: string,
  brandName: string,
  dir: string,
  asLegacy = false,
): string => {
  const lines = upstream.replace(/\r\n/g, "\n").split("\n")
  const open = lines.indexOf("---")
  const close = lines.indexOf("---", open + 1)
  // Fail loudly on drift, like fixDangling/rebrand: a skill with no frontmatter means the shape moved.
  if (open !== 0 || close === -1) {
    throw new Error(
      `.agents/skills/${dir}/SKILL.md has no frontmatter to reconcile (the skill shape drifted). Update packages/cli/src/skills.ts.`,
    )
  }
  const upstreamSource = sourceOf(upstream)
  // A skill zerostarter authored becomes one this fork syncs from zerostarter; one zerostarter vendored from a tool keeps that tool as its source, so the fork re-vendors it the same way and it stays in the vendored table instead of claiming to come from here.
  const forkSource =
    asLegacy || upstreamSource === "" || upstreamSource === "local" ? UPSTREAM : upstreamSource
  const fm = lines
    .slice(open + 1, close)
    .map((line) =>
      line.startsWith("source:") ? `source: ${forkSource}` : reconcile(line, slug, brandName),
    )
  if (!fm.some((line) => line.startsWith("source:"))) fm.push(`source: ${forkSource}`)
  const body = reconcile(lines.slice(close + 1).join("\n"), slug, brandName).replace(/^\n+/, "")
  // Only a skill this fork syncs from here carries the note; a vendored one is re-synced by re-running its own tool.
  const note = forkSource === UPSTREAM ? `${syncNote()}\n\n` : ""
  return `---\n${fm.join("\n")}\n---\n\n${note}${body}`
}

// Reconcile the scaffolded skills to the fork. `before` is the fork's pre-overlay snapshot (sync only; init has nothing to preserve): a skill it shows as fork-authored, opted out of syncing, or edited since the CLI last wrote it is restored and left alone, so an overlay never silently drops the fork's own work.
export const reconcileForkSkills = (
  root: string,
  brand: Brand,
  before?: Map<string, string>,
): SkillReconcile => {
  const dir = join(root, ".agents/skills")
  const result = emptyReconcile()
  if (!exists(dir)) return result
  const slug = slugify(brand.name)
  const ledger = readLedger(root)
  const next: SkillLedger = {}
  for (const name of skillDirs(dir)) {
    const file = join(dir, name, "SKILL.md")
    const upstream = read(file)
    const written = renderForkSkill(upstream, slug, brand.name, name)
    const prev = before === undefined ? undefined : before.get(name)
    const carry = ledger[name]
    if (prev !== undefined) {
      const prevSource = sourceOf(prev)
      const keep = (bucket: string[]): void => {
        write(file, prev)
        bucket.push(name)
        if (carry) next[name] = carry
      }
      // The fork authored it, or took it from some other upstream: never ours to rewrite.
      if (prevSource === "local" || (prevSource.includes("/") && prevSource !== UPSTREAM)) {
        keep(result.forkOwned)
        continue
      }
      // The note is the documented opt-out, so a fork that dropped it owns the skill.
      if (prevSource === UPSTREAM && !prev.includes(NOTE_MARKER)) {
        keep(result.forkOwned)
        continue
      }
      if (carry) {
        // Edited since the CLI last wrote it, so the fork owns it now.
        if (carry.written !== digest(prev)) {
          keep(result.customized)
          continue
        }
      } else {
        // A fork last synced by a pre-ledger CLI has no entry, and an edit here is indistinguishable from upstream having moved. Preserving on that ambiguity would freeze every such fork's skills, so take the update (it lands in a diff the fork reviews before committing) and name the ones that were not already what we would write, in either shape that CLI could have produced.
        const recognized =
          digest(prev) === digest(written) ||
          digest(prev) === digest(renderForkSkill(upstream, slug, brand.name, name, true))
        if (!recognized) result.unverified.push(name)
      }
    }
    write(file, written)
    next[name] = { upstream: digest(upstream), written: digest(written) }
    result.adopted.push(name)
  }
  writeJson(join(root, SKILL_LEDGER), next)
  return result
}

// True when the fork's AGENTS.md predates the generated skills tables. Its own skills-manager (and the pre-commit hook calling it) throws without these markers, and sync cannot just add them: AGENTS.md is fork-excluded, so the fork owns that file.
export const missingSkillTableMarkers = (root: string): boolean => {
  const path = join(root, "AGENTS.md")
  if (!exists(path)) return false
  const text = read(path)
  return !text.includes("<!-- skills:custom -->") || !text.includes("<!-- skills:vendored -->")
}

// Fill the fork's AGENTS.md skills tables using the fork's own maintainer script, so the catalog matches the skills this reconcile left in place. Runs after install, since the script formats through oxfmt. Best-effort: a fork that dropped the script still scaffolds.
export const regenerateSkillTables = async (root: string): Promise<void> => {
  if (!exists(join(root, ".github/scripts/skills-manager.ts"))) return
  try {
    await run("bun", [".github/scripts/skills-manager.ts"], root)
  } catch {
    // a fork that customized the manager or its markers keeps its own AGENTS.md
  }
}

// Rebrand a fork's overlaid skills from its own package.json name. A sync overlay re-adds upstream SKILL.md files that name "zerostarter" and there is no brand prompt, so source the fork identity from the preserved root package.json (mergePkg keeps `name` on sync). A missing name (never scaffolded) is a no-op.
export const reconcileForkSkillsFromRoot = (
  root: string,
  before?: Map<string, string>,
): SkillReconcile => {
  const name = readJson<{ name?: string }>(join(root, "package.json")).name
  if (!name) return emptyReconcile()
  return reconcileForkSkills(root, { name }, before)
}
