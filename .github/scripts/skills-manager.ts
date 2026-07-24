import path from "node:path"

import { $, Glob } from "bun"

// Skill maintainer: the AGENTS.md skills tables duplicate each skill's own description, so they are GENERATED from .agents/skills/*/SKILL.md frontmatter instead of hand-kept.
//   bun .github/scripts/skills-manager.ts            rewrite the AGENTS.md tables from the skills (default)
//   bun .github/scripts/skills-manager.ts --check    fail on drift instead of writing (the pre-commit gate)
//   bun .github/scripts/skills-manager.ts --outdated fetch each skill's source upstream and report drift
// A skill's source is its provenance: a full github link it was inherited from (checked by --outdated), a bare tool name (vendored, re-run the tool), or local (authored here).

const ROOT = path.resolve(import.meta.dir, "../..")
const SKILLS_DIR = path.join(ROOT, ".agents/skills")
const AGENTS = path.join(ROOT, "AGENTS.md")
const UPSTREAM_REF = "canary" // zerostarter default branch; where --outdated reads from

type Skill = {
  name: string
  description: string
  summary: string
  source: string
  dir: string
  file: string
}

// Parse the `---` frontmatter block into a flat key->value map (values are single-line here).
function frontmatter(text: string): Record<string, string> {
  const lines = text.split("\n")
  if (lines[0] !== "---") throw new Error("missing frontmatter")
  const end = lines.indexOf("---", 1)
  if (end === -1) throw new Error("unterminated frontmatter")
  const fm: Record<string, string> = {}
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([a-z0-9_-]+):\s*(.*)$/i)
    if (m) fm[m[1]!] = m[2]!.trim()
  }
  return fm
}

// The description is "<summary>. Use when <triggers>"; the table wants only the summary.
const summaryOf = (description: string) =>
  description.split(/\.\s+(?=Use\b|Triggers\b|Prefer\b)/)[0]!.replace(/\.?$/, ".")

// Vendored skills carry a bare tool name as their source; everything else (an owner/repo or `local`) is maintained here.
const isVendored = (source: string) => !source.includes("/") && source !== "local"

async function readSkills(): Promise<Skill[]> {
  const glob = new Glob("*/SKILL.md")
  const skills: Skill[] = []
  for await (const rel of glob.scan({ cwd: SKILLS_DIR })) {
    const file = path.join(SKILLS_DIR, rel)
    const fm = frontmatter(await Bun.file(file).text())
    if (!fm.name || !fm.description || !fm.source)
      throw new Error(`${rel}: frontmatter needs name, description, and source`)
    skills.push({
      name: fm.name,
      description: fm.description,
      summary: summaryOf(fm.description),
      source: fm.source,
      dir: rel.split(/[/\\]/)[0]!,
      file,
    })
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

const table = (skills: Skill[]) =>
  [
    "| Skill | Description |",
    "| --- | --- |",
    ...skills.map((s) => `| [${s.name}](.agents/skills/${s.dir}/SKILL.md) | ${s.summary} |`),
  ].join("\n")

// Replace the body between `<!-- skills:<id> -->` and `<!-- /skills:<id> -->`.
function replaceRegion(doc: string, id: string, body: string): string {
  const re = new RegExp(`(<!-- skills:${id} -->)[\\s\\S]*?(<!-- /skills:${id} -->)`)
  if (!re.test(doc)) throw new Error(`AGENTS.md is missing the skills:${id} markers`)
  return doc.replace(re, `$1\n\n${body}\n\n$2`)
}

async function render(): Promise<string> {
  const skills = await readSkills()
  let doc = await Bun.file(AGENTS).text()
  doc = replaceRegion(doc, "custom", table(skills.filter((s) => !isVendored(s.source))))
  doc = replaceRegion(doc, "vendored", table(skills.filter((s) => isVendored(s.source))))
  return format(doc)
}

// oxfmt owns the table-column alignment, so run the render through it, otherwise the compact output drifts from what lint-staged commits and the --check gate flip-flops.
async function format(doc: string): Promise<string> {
  const tmp = path.join(ROOT, ".skills.agents.tmp.md")
  try {
    await Bun.write(tmp, doc)
    await $`bunx oxfmt --write ${tmp}`.quiet()
    return await Bun.file(tmp).text()
  } finally {
    await $`rm -f ${tmp}`.quiet()
  }
}

async function outdated(): Promise<void> {
  const skills = await readSkills()
  for (const s of skills) {
    // `source` is a full github link on a fork, an `owner/repo` shorthand, a tool name, or `local`.
    const repo = s.source.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "")
    if (!repo.includes("/")) {
      console.log(
        `  ${s.name}: ${s.source === "local" ? "local, no upstream" : `vendored (${s.source})`}`,
      )
      continue
    }
    const url = `https://raw.githubusercontent.com/${repo}/${UPSTREAM_REF}/.agents/skills/${s.dir}/SKILL.md`
    const res = await fetch(url)
    if (res.status === 404) {
      console.log(`  ${s.name}: not in ${s.source} (local-only or renamed upstream)`)
      continue
    }
    if (!res.ok) {
      console.log(`  ${s.name}: upstream fetch failed (HTTP ${res.status})`)
      continue
    }
    // Compare bodies only; our added `source:` line and other local frontmatter edits are expected.
    const body = (t: string) => t.slice(t.indexOf("---", 3) + 3).trim()
    const ours = body(await Bun.file(s.file).text())
    const theirs = body(await res.text())
    console.log(`  ${s.name}: ${ours === theirs ? "up to date" : "DIFFERS from upstream"}`)
  }
}

const arg = process.argv[2]
if (arg === "--outdated") {
  await outdated()
} else if (arg === "--check") {
  const want = await render()
  if ((await Bun.file(AGENTS).text()) !== want) {
    console.error("AGENTS.md skills tables are stale. Run: bun .github/scripts/skills-manager.ts")
    process.exit(1)
  }
  console.log("AGENTS.md skills tables are up to date.")
} else {
  await Bun.write(AGENTS, await render())
  console.log("Wrote AGENTS.md skills tables.")
}
