import { join } from "node:path"

import { determineSemverChange, getGitDiff, loadChangelogConfig, parseCommits } from "changelogen"

// The number the next release will carry, decided before the release merge so the tree main builds from already holds it. Three rules: the number a window has earned is changelogen's bump applied to the last tag's version (a missing tag counts as v0.0.0), never to whatever package.json says, or a number set early would be bumped twice; the tree moves forward only, to max(tree, earned), so a hand-set ahead of both stays; a tree below the last tag is refused loudly. changelogen is used as a library, its own config and commit parsing with no changelog rendered, so the decision touches no file and no network. Prints the decision as JSON; --write moves package.json when the decision is ahead of it. Runs from the repo root (cwd), which is what the workflows and bun run release:version do.

type Version = [number, number, number]

type Change = NonNullable<ReturnType<typeof determineSemverChange>>

export type Decision = {
  current: string
  earned: string
  moved: boolean
  next: string
  tag: string | null
}

// Every "version" field in a manifest, spacing after the colon captured so a rewrite keeps the file's shape.
const VERSION_FIELD = /"version":(\s*)"([^"]+)"/g

const parse = (version: string): Version => {
  const parts = version.split(".").map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`not a release version: ${version}`)
  }
  return [parts[0], parts[1], parts[2]]
}

// The version a tag names, or the baseline a repository with no tag yet starts from.
export const baseOf = (tag: string | null): string =>
  tag === null ? "0.0.0" : tag.replace(/^v/, "")

// Negative when a is behind b, zero when equal, positive when ahead; plain numeric semver, which is all this repo tags.
export const compare = (a: string, b: string): number => {
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

// The version one change up from another, as changelogen's bump command moves it: below 1.0 a major counts as a minor and a minor as a patch.
export const bump = (version: string, change: Change): string => {
  const [major, minor, patch] = parse(version)
  const step = major > 0 ? change : change === "major" ? "minor" : "patch"
  if (step === "major") return `${major + 1}.0.0`
  if (step === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

// The decision, pure: current is the tree, earned is what the window's commits add to the tag's version.
export const decide = (current: string, earned: string, tag: string | null): Decision => {
  const base = baseOf(tag)
  if (compare(current, base) < 0) {
    throw new Error(`package.json is at ${current}, below the last release v${base}`)
  }
  const next = compare(current, earned) >= 0 ? current : earned
  return { current, earned, moved: next !== current, next, tag }
}

const run = (cmd: string[], cwd: string): { err: string; ok: boolean; out: string } => {
  const proc = Bun.spawnSync(cmd, { cwd, stderr: "pipe", stdout: "pipe" })
  return {
    err: proc.stderr.toString().trim(),
    ok: proc.exitCode === 0,
    out: proc.stdout.toString().trim(),
  }
}

// How many objects and arrays enclose the character at index, strings skipped, so a field can be told apart from a same-named one nested deeper.
const depthAt = (text: string, index: number): number => {
  let depth = 0
  let quoted = false
  for (let i = 0; i < index; i++) {
    const c = text[i]
    if (quoted) {
      if (c === "\\") i++
      else if (c === '"') quoted = false
    } else if (c === '"') quoted = true
    else if (c === "{" || c === "[") depth++
    else if (c === "}" || c === "]") depth--
  }
  return depth
}

// The package's own version field: the first one at the top level of the object, so one inside a nested object is never read or rewritten in its place.
const ownVersionField = (file: string, text: string): RegExpExecArray => {
  for (const match of text.matchAll(VERSION_FIELD)) {
    if (depthAt(text, match.index) === 1) return match
  }
  throw new Error(`${file} has no top-level "version" field`)
}

export const readVersion = async (file: string): Promise<string> =>
  ownVersionField(file, await Bun.file(file).text())[2]

// Rewrites the version field in place, keeping the rest of the file byte for byte.
export const writeVersion = async (file: string, version: string): Promise<void> => {
  const text = await Bun.file(file).text()
  const match = ownVersionField(file, text)
  const field = `"version":${match[1]}"${version}"`
  await Bun.write(
    file,
    text.slice(0, match.index) + field + text.slice(match.index + match[0].length),
  )
}

// What the window since the tag has earned on top of the tag's version. The commits are the ones changelogen's own command keeps for the changelog (its config from changelog.config.json, disabled types and non-breaking chore(deps) dropped), so a window that keeps none earns nothing, which is the entry auto-release's content gate demands; the change is its semver reading of them, falling back to the patch its command bumps when no commit says more.
const earnedFrom = async (root: string, tag: string | null): Promise<string> => {
  const from = tag === null ? undefined : tag
  const config = await loadChangelogConfig(root, { cwd: root, from, to: "HEAD" })
  const kept = parseCommits(await getGitDiff(from, "HEAD", root), config).filter(
    (commit) =>
      config.types[commit.type] &&
      !(commit.type === "chore" && commit.scope === "deps" && !commit.isBreaking),
  )
  if (kept.length === 0) return baseOf(tag)
  return bump(baseOf(tag), determineSemverChange(kept, config) ?? "patch")
}

// The last v* tag HEAD can reach, or null for a repository with no tag yet. git describe fails the same way for a repository with no tag and for one whose tags HEAD cannot reach (a shallow clone without them); only the first is a fresh start, the second would compute from v0.0.0 and answer wrong, so it stops here.
const lastTag = (root: string): string | null => {
  const described = run(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"], root)
  if (described.ok) return described.out === "" ? null : described.out
  const listed = run(["git", "tag", "--list", "v*"], root)
  if (!listed.ok) throw new Error(`git tag failed: ${listed.err}`)
  if (listed.out !== "") {
    throw new Error("v* tags exist but none is reachable from HEAD; fetch the tags first")
  }
  return null
}

// The decision for the repository at root: its last tag, its tree, and what its window has earned.
export const decideIn = async (root: string): Promise<Decision> => {
  const tag = lastTag(root)
  const current = await readVersion(join(root, "package.json"))
  return decide(current, await earnedFrom(root, tag), tag)
}

if (import.meta.main) {
  const root = process.cwd()
  const decision = await decideIn(root)
  if (decision.moved && process.argv.includes("--write")) {
    await writeVersion(join(root, "package.json"), decision.next)
  }
  console.log(JSON.stringify(decision))
}
