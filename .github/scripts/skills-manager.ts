import { createHash } from "node:crypto"
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
const UPSTREAM_REF = "main" // the branch the CLI scaffolds and syncs a fork from; a ledger entry may name its own

type Skill = {
  name: string
  description: string
  summary: string
  source: string
  dir: string
  file: string
}

// Parse the `---` frontmatter into a flat key->string map via real YAML, so a quoted value (a description with a colon must be quoted for strict parsers like GitHub's) is unwrapped, not read literally; fail loudly on an unquoted colon so a GitHub-unrenderable description never lands.
function frontmatter(text: string): Record<string, string> {
  const lines = text.split("\n")
  if (lines[0] !== "---") throw new Error("missing frontmatter")
  const end = lines.indexOf("---", 1)
  if (end === -1) throw new Error("unterminated frontmatter")
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([a-z0-9_-]+): (.*: .*)$/i)
    if (m && !/^["']/.test(m[2]!))
      throw new Error(
        `frontmatter "${m[1]}" has an unquoted colon; wrap the value in quotes, since strict YAML like GitHub's rejects it: ${line.trim()}`,
      )
  }
  const parsed = Bun.YAML.parse(lines.slice(1, end).join("\n"))
  const fm: Record<string, string> = {}
  if (parsed && typeof parsed === "object")
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "string") fm[k] = v
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

// The CLI records, per skill it synced into a fork, the hash of the upstream file it came from and of the file as written there. Comparing prose is not an option: sync rebrands the body to the fork's own name and prepends its note, so a synced skill can never match upstream byte for byte and every one would report as drifted.
type LedgerEntry = { ref?: string; upstream: string; written: string }

async function readLedger(): Promise<Record<string, LedgerEntry>> {
  const file = Bun.file(path.join(SKILLS_DIR, ".sync.json"))
  if (!(await file.exists())) return {}
  try {
    return await file.json()
  } catch {
    return {}
  }
}

// Line-ending-normalized, matching the CLI: a Windows checkout must not read as drifted over CRLF alone.
const digest = (text: string) =>
  createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12)

async function outdated(): Promise<void> {
  const skills = await readSkills()
  const ledger = await readLedger()
  for (const s of skills) {
    // `source` is a full github link on a fork, an `owner/repo` shorthand, a tool name, or `local`.
    const repo = s.source.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "")
    if (!repo.includes("/")) {
      console.log(
        `  ${s.name}: ${s.source === "local" ? "local, no upstream" : `vendored (${s.source})`}`,
      )
      continue
    }
    const entry = ledger[s.dir]
    // Sync records only the skills it wrote, so an untracked one is either customized here (sync keeps that version and stops tracking it) or predates the ledger.
    if (!entry) {
      console.log(`  ${s.name}: untracked (customized here, or synced before tracking existed)`)
      continue
    }
    // Compare against the ref the entry was synced from, so a fork on main is not told it is behind for every skill this repo's default branch is ahead on.
    const ref = entry.ref ?? UPSTREAM_REF
    const url = `https://raw.githubusercontent.com/${repo}/${ref}/.agents/skills/${s.dir}/SKILL.md`
    const res = await fetch(url)
    if (res.status === 404) {
      console.log(`  ${s.name}: not in ${s.source} (local-only or renamed upstream)`)
      continue
    }
    if (!res.ok) {
      console.log(`  ${s.name}: upstream fetch failed (HTTP ${res.status})`)
      continue
    }
    // Upstream moving is what "outdated" means; a local edit is separate news, since sync will keep that version rather than take the update.
    const behind = digest(await res.text()) !== entry.upstream
    const edited = digest(await Bun.file(s.file).text()) !== entry.written
    const suffix = edited ? ", edited here (sync keeps your version)" : ""
    console.log(`  ${s.name}: ${behind ? "DIFFERS from upstream" : "up to date"}${suffix}`)
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
