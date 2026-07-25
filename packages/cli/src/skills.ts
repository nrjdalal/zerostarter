import { createHash } from "node:crypto"
import { readdirSync } from "node:fs"
import { join } from "node:path"

import { exists, read, readJson, write } from "@/io"
import type { Brand } from "@/templates"

// A fork inherits its whole skill set from zerostarter (vendored skills included, received through zerostarter rather than the tool directly), so every scaffolded skill is marked as synced from here.
const UPSTREAM = "https://github.com/nrjdalal/zerostarter"

// npm-safe slug derived from the project name (shared with convert.ts's rebrand).
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "app"

// Rebrand the fork's own identity (display name, portless dev-URL names, docker image, log paths) while preserving upstream references: `bunx zerostarter` is the CLI a fork still runs to sync (it ships none of its own) and "zerostarter scaffolding CLI" names that upstream tool, so a lowercase "zerostarter" preceded by "bunx " or followed by " scaffolding CLI" is left alone. The frontmatter source line and sync note are stamped separately and never pass through here.
const reconcile = (text: string, slug: string, name: string): string =>
  text.replaceAll("ZeroStarter", name).replace(/(?<!bunx )zerostarter(?! scaffolding CLI)/g, slug)

// The sync CAUTION stamped just below each fork skill's frontmatter; its presence is the contract, since bunx zerostarter updates a skill only while the note is intact and the body still matches upstream, and customizing the skill or dropping the note hands ownership to the fork.
const syncNote = (): string =>
  `> [!CAUTION]
> Synced from ${UPSTREAM}. Customize this skill or remove this note to stop syncing.`

// Drift stamp shared with .github/scripts/skills-manager.ts: 16 hex chars of sha256 over the LF-normalized, trimmed text; keep both implementations identical.
const hashBody = (text: string): string =>
  createHash("sha256").update(text.replace(/\r\n/g, "\n").trim()).digest("hex").slice(0, 16)

// Split a SKILL.md into frontmatter lines and body, tolerating CRLF (a gitpick checkout on Windows); throws on a missing frontmatter block, which means the skill shape drifted.
const splitSkill = (skill: string, text: string): { fm: string[]; body: string } => {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const close = lines.indexOf("---", 1)
  if (lines[0] !== "---" || close === -1) {
    throw new Error(
      `.agents/skills/${skill}/SKILL.md has no frontmatter to reconcile (the skill shape drifted). Update packages/cli/src/skills.ts.`,
    )
  }
  return { body: lines.slice(close + 1).join("\n"), fm: lines.slice(1, close) }
}

// Read a single-line frontmatter value, unwrapping double quotes; "" when the key is absent.
const fmValue = (fm: string[], key: string): string => {
  for (const line of fm) {
    if (!line.startsWith(`${key}: `)) continue
    return line
      .slice(key.length + 2)
      .trim()
      .replace(/^"(.*)"$/, "$1")
  }
  return ""
}

// Transform one upstream SKILL.md for the fork: rebrand the prose, point source at upstream, stamp the sync note, and record the drift hashes. source-hash is the upstream body as fetched (what skills-manager --outdated compares against a fresh upstream fetch); synced-hash is the body as written (what the next sync compares to detect fork customization).
const transformSkill = (skill: string, text: string, slug: string, name: string): string => {
  const { body: rawBody, fm: rawFm } = splitSkill(skill, text)
  const fm = rawFm
    .filter((line) => !line.startsWith("source-hash:") && !line.startsWith("synced-hash:"))
    .map((line) =>
      line.startsWith("source:") ? `source: ${UPSTREAM}` : reconcile(line, slug, name),
    )
  if (!fm.some((line) => line.startsWith("source:"))) fm.push(`source: ${UPSTREAM}`)
  const written = `${syncNote()}\n\n${reconcile(rawBody, slug, name).replace(/^\n+/, "")}`
  // Double-quoted so YAML always reads the stamp as a string (an all-digit or digits+e hash would otherwise parse as a number and vanish).
  fm.push(`source-hash: "${hashBody(rawBody)}"`, `synced-hash: "${hashBody(written)}"`)
  return `---\n${fm.join("\n")}\n---\n\n${written}`
}

// Every .agents/skills/<skill>/SKILL.md under root, as [skill, path] pairs.
const skillFiles = (root: string): [string, string][] => {
  const dir = join(root, ".agents/skills")
  if (!exists(dir)) return []
  const out: [string, string][] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(dir, entry.name, "SKILL.md")
    if (exists(file)) out.push([entry.name, file])
  }
  return out
}

// Reconcile every scaffolded skill to the fork (init/reinit, where the whole tree is a fresh upstream fetch): rename the upstream identity in prose, point source at the upstream repo, and stamp the sync note plus drift hashes; a fork has no packages/cli of its own, so bunx zerostarter is how it later pulls skill updates.
export const reconcileForkSkills = (root: string, brand: Brand): void => {
  const slug = slugify(brand.name)
  for (const [skill, file] of skillFiles(root)) {
    write(file, transformSkill(skill, read(file), slug, brand.name))
  }
}

// Snapshot every skill before the sync overlay overwrites them, keyed by skill directory name.
export const snapshotForkSkills = (root: string): Map<string, string> =>
  new Map(skillFiles(root).map(([skill, file]) => [skill, read(file)]))

export type SkillSyncResult = {
  added: string[]
  kept: string[]
  skipped: string[]
  unverified: string[]
  updated: string[]
}

// Provenance-aware skill reconcile for sync: the overlay re-added upstream SKILL.md files over the fork's, so decide per skill, from its pre-overlay snapshot, who owns it. A source that is not this repo (local, a tool, another repo) restores the fork's file untouched (kept). A dropped sync note, an unparseable file, or a body customized since its synced-hash stamp restores the fork's file untouched (skipped). A note-intact skill whose stamp matches takes the fresh upstream body (updated). A note-intact skill with no stamp (a pre-stamp fork) is overwritten but reported by name (unverified), so customizations are recoverable from the sync diff; the fork identity comes from the preserved root package.json (a missing name means never scaffolded: no-op).
export const syncForkSkills = (root: string, preSkills: Map<string, string>): SkillSyncResult => {
  const result: SkillSyncResult = { added: [], kept: [], skipped: [], unverified: [], updated: [] }
  const name = readJson<{ name?: string }>(join(root, "package.json")).name
  if (!name) return result
  const slug = slugify(name)
  for (const [skill, file] of skillFiles(root)) {
    const post = read(file)
    const pre = preSkills.get(skill)
    if (pre === undefined) {
      write(file, transformSkill(skill, post, slug, name))
      result.added.push(skill)
      continue
    }
    if (post === pre) continue
    let split: { fm: string[]; body: string }
    try {
      split = splitSkill(skill, pre)
    } catch {
      write(file, pre)
      result.skipped.push(skill)
      continue
    }
    if (fmValue(split.fm, "source") !== UPSTREAM) {
      write(file, pre)
      result.kept.push(skill)
      continue
    }
    const stamp = fmValue(split.fm, "synced-hash")
    if (!split.body.includes(syncNote()) || (stamp && hashBody(split.body) !== stamp)) {
      write(file, pre)
      result.skipped.push(skill)
      continue
    }
    const next = transformSkill(skill, post, slug, name)
    write(file, next)
    if (next !== pre) (stamp ? result.updated : result.unverified).push(skill)
  }
  return result
}
