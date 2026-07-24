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

// Reconcile every scaffolded skill to the fork: rename the upstream identity in prose, point source at the upstream repo, and stamp the sync note; a fork has no packages/cli of its own, so bunx zerostarter is how it later pulls skill updates.
export const reconcileForkSkills = (root: string, brand: Brand): void => {
  const dir = join(root, ".agents/skills")
  if (!exists(dir)) return
  const slug = slugify(brand.name)
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = join(dir, entry.name, "SKILL.md")
    if (!exists(file)) continue
    const lines = read(file).split("\n")
    const open = lines.indexOf("---")
    const close = lines.indexOf("---", open + 1)
    // Fail loudly on drift, like fixDangling/rebrand: a skill with no frontmatter means the shape moved.
    if (open !== 0 || close === -1) {
      throw new Error(
        `.agents/skills/${entry.name}/SKILL.md has no frontmatter to reconcile (the skill shape drifted). Update packages/cli/src/skills.ts.`,
      )
    }
    const fm = lines.slice(open + 1, close).map((line) => {
      if (line.startsWith("source:")) return `source: ${UPSTREAM}`
      return reconcile(line, slug, brand.name)
    })
    if (!fm.some((line) => line.startsWith("source:"))) fm.push(`source: ${UPSTREAM}`)
    const body = reconcile(lines.slice(close + 1).join("\n"), slug, brand.name).replace(/^\n+/, "")
    write(file, `---\n${fm.join("\n")}\n---\n\n${syncNote()}\n\n${body}`)
  }
}

// Rebrand a fork's overlaid skills from its own package.json name. A sync overlay re-adds upstream SKILL.md files that name "zerostarter" and there is no brand prompt, so source the fork identity from the preserved root package.json (mergePkg keeps `name` on sync). A missing name (never scaffolded) is a no-op.
export const reconcileForkSkillsFromRoot = (root: string): void => {
  const name = readJson<{ name?: string }>(join(root, "package.json")).name
  if (name) reconcileForkSkills(root, { name })
}
