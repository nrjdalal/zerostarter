import { readdirSync } from "node:fs"
import { join } from "node:path"

import { exists, read, write } from "@/io"
import type { Brand } from "@/templates"

// A fork inherits its whole skill set from zerostarter (vendored skills included, since the fork
// receives them through zerostarter, not the tool directly). So every scaffolded skill is marked
// as synced from here.
const UPSTREAM = "https://github.com/nrjdalal/zerostarter"

// npm-safe slug derived from the project name (shared with convert.ts's rebrand).
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "app"

// Rename the upstream identity to the fork's, in prose only. The frontmatter `source` line is set
// separately and never rewritten (it must keep pointing at the real upstream repo).
const reconcile = (text: string, slug: string, name: string): string =>
  text.replaceAll("ZeroStarter", name).replaceAll("zerostarter", slug)

// The sync CAUTION stamped just below each fork skill's frontmatter. Its presence is the contract:
// `bunx zerostarter` updates a skill only while this note is intact and the body still matches
// upstream. Customize the skill or drop the note and the fork owns it, no more syncing.
const syncNote = (): string =>
  `> [!CAUTION]
> Synced from ${UPSTREAM}. If you customize this skill or remove this note, it stops syncing and your fork owns it.`

// Reconcile every scaffolded skill to the fork: rename the upstream identity in prose, point
// `source` at the upstream repo, and stamp the sync note. Runs during a fork convert; a fork has no
// packages/cli of its own, so `bunx zerostarter` is how it later pulls skill updates.
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
