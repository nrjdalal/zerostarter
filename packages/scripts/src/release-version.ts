import { join } from "node:path"

// The number the next release will carry, decided before the release merge so the tree main builds from already holds it. Three rules: the number a window has earned is changelogen's bump applied to the last tag's version (a missing tag counts as v0.0.0), never to whatever package.json says, or a number set early would be bumped twice; the tree moves forward only, to max(tree, earned), so a hand-set ahead of both stays; a tree below the last tag is refused loudly. Prints the decision as JSON; --write moves package.json when the decision is ahead of it. Runs from the repo root (cwd), which is what the workflows and bun run release:version do.

type Version = [number, number, number]

export type Decision = {
  current: string
  earned: string
  moved: boolean
  next: string
  tag: string | null
}

const VERSION_FIELD = /"version":\s*"([^"]+)"/

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

const readVersion = async (file: string): Promise<string> => {
  const match = VERSION_FIELD.exec(await Bun.file(file).text())
  if (match === null) throw new Error(`${file} has no "version" field`)
  return match[1]
}

// Rewrites the version field in place, keeping the rest of the file byte for byte, and refuses a file it cannot find the field in.
const writeVersion = async (file: string, version: string): Promise<void> => {
  const text = await Bun.file(file).text()
  if (!VERSION_FIELD.test(text)) throw new Error(`${file} has no "version" field`)
  await Bun.write(file, text.replace(VERSION_FIELD, `"version": "${version}"`))
}

// This package's own changelogen, declared as its dependency and anchored to this file, so a throwaway repository in a test computes with the same locked binary the workflows use.
const changelogen = join(import.meta.dir, "../node_modules/.bin/changelogen")

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
    const bumped = run(["bun", changelogen, "--bump", "--no-commit", ...from], root)
    if (!bumped.ok) throw new Error(`changelogen failed: ${bumped.err || bumped.out}`)
    // changelogen drops some types from the changelog (ci, and chore(deps)) yet still bumps; auto-release refuses a section with no entry, so a window that earns no entry earns no number either.
    const section = (await Bun.file(changelog).text()).split(/^## /m)[1] ?? ""
    const entries = section.split("### ❤️ Contributors")[0]
    if (!/^- /m.test(entries)) return baseOf(tag)
    return await readVersion(pkg)
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

export const decideHere = async (root: string): Promise<Decision> => {
  const described = run(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"], root)
  const tag = described.ok && described.out !== "" ? described.out : null
  const current = await readVersion(join(root, "package.json"))
  const earned = releasable(root, tag) ? await earnedFrom(root, tag) : baseOf(tag)
  return decide(current, earned, tag)
}

if (import.meta.main) {
  const root = process.cwd()
  const decision = await decideHere(root)
  if (decision.moved && process.argv.includes("--write")) {
    await writeVersion(join(root, "package.json"), decision.next)
  }
  console.log(JSON.stringify(decision))
}
