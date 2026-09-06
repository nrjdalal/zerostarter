import { dirname, join } from "node:path"

// The number the next release will carry, decided before the release merge so the tree main builds from already holds it. Three rules: the number a window has earned is changelogen's bump applied to the last tag's version (a missing tag counts as v0.0.0), never to whatever package.json says, or a number set early would be bumped twice; the tree moves forward only, to max(tree, earned), so a hand-set ahead of both stays; a tree below the last tag is refused loudly. Prints the decision as JSON; --write moves package.json when the decision is ahead of it. Runs from the repo root (cwd), which is what the workflows and bun run release:version do.

type Version = [number, number, number]

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

// This package's own changelogen, declared as its dependency and resolved from this file, so a throwaway repository in a test computes with the same locked binary the workflows use. Its bin is read from its manifest (which Bun resolves although changelogen's exports map lists only its entry) rather than from the .bin shim, which Bun writes as .exe and .bunx on Windows.
const changelogenManifest = Bun.resolveSync("changelogen/package.json", import.meta.dir)
const changelogen = join(
  dirname(changelogenManifest),
  JSON.parse(await Bun.file(changelogenManifest).text()).bin.changelogen,
)

// changelogen bumps whatever package.json holds and writes the changelog, so it runs against a copy set to the tag's version, and both files are put back afterwards.
const earnedFrom = async (root: string, tag: string | null): Promise<string> => {
  const pkg = join(root, "package.json")
  const changelog = join(root, "CHANGELOG.md")
  const pkgText = await Bun.file(pkg).text()
  const hadChangelog = await Bun.file(changelog).exists()
  const changelogText = hadChangelog ? await Bun.file(changelog).text() : ""
  try {
    await writeVersion(pkg, baseOf(tag))
    const from = tag === null ? [] : ["--from", tag]
    const bumped = run([process.execPath, changelogen, "--bump", "--no-commit", ...from], root)
    // changelogen's CLI reports its own errors and still exits 0, so success is read from what it left behind: the version moved past the tag's and a section for it heads the changelog. Measured: even a window of nothing it recognizes bumps a patch and writes an empty section, which the content gate below then discounts.
    const version = await readVersion(pkg)
    const text = (await Bun.file(changelog).exists()) ? await Bun.file(changelog).text() : ""
    const header = new RegExp(`^## v${version.replaceAll(".", "\\.")}\\r?$`, "m").exec(text)
    const headed = header !== null && text.search(/^## /m) === header.index
    if (!bumped.ok || compare(version, baseOf(tag)) <= 0 || !headed) {
      throw new Error(`changelogen failed: ${bumped.err || bumped.out}`)
    }
    // changelogen drops some types from the changelog (ci, and chore(deps)) yet still bumps; auto-release refuses a section with no entry, so a window that earns no entry earns no number either.
    const entries = (text.split(/^## v/m)[1] ?? "").split("### ❤️ Contributors")[0]
    if (!/^- /m.test(entries)) return baseOf(tag)
    return version
  } finally {
    await Bun.write(pkg, pkgText)
    if (hadChangelog) await Bun.write(changelog, changelogText)
    else if (await Bun.file(changelog).exists()) await Bun.file(changelog).delete()
  }
}

// changelogen bumps a patch even for a window of nothing but mechanical commits, so the window is checked first the way auto-release's own gate checks it: with only ci(changelog) and ci(version) commits since the tag, nothing was earned.
const releasable = (root: string, tag: string | null): boolean => {
  const range = tag === null ? "HEAD" : `${tag}..HEAD`
  const counted = run(
    [
      "git",
      "rev-list",
      "--count",
      "--invert-grep",
      "--grep=^ci(changelog)",
      "--grep=^ci(version)",
      range,
    ],
    root,
  )
  if (!counted.ok) throw new Error(`git rev-list failed: ${counted.err}`)
  return counted.out !== "0"
}

// The decision for the repository at root: its last tag, its tree, and what its window has earned.
export const decideIn = async (root: string): Promise<Decision> => {
  const described = run(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"], root)
  // git describe fails the same way for a repository with no tag and for one whose tags HEAD cannot reach (a shallow clone without them); only the first is a fresh start, the second would compute from v0.0.0 and answer wrong, so it stops here.
  if (!described.ok) {
    const listed = run(["git", "tag", "--list", "v*"], root)
    if (!listed.ok) throw new Error(`git tag failed: ${listed.err}`)
    if (listed.out !== "") {
      throw new Error("v* tags exist but none is reachable from HEAD; fetch the tags first")
    }
  }
  const tag = described.ok && described.out !== "" ? described.out : null
  const current = await readVersion(join(root, "package.json"))
  const earned = releasable(root, tag) ? await earnedFrom(root, tag) : baseOf(tag)
  return decide(current, earned, tag)
}

if (import.meta.main) {
  const root = process.cwd()
  const decision = await decideIn(root)
  if (decision.moved && process.argv.includes("--write")) {
    await writeVersion(join(root, "package.json"), decision.next)
  }
  console.log(JSON.stringify(decision))
}
