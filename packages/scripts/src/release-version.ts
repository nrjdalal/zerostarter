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

const parse = (version: string): Version => {
  const parts = version.split(".").map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`not a release version: ${version}`)
  }
  return [parts[0], parts[1], parts[2]]
}

// Negative when a is behind b, zero when equal, positive when ahead; plain numeric semver, which is all this repo tags.
export const compare = (a: string, b: string): number => {
  const [x, y] = [parse(a), parse(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

// The decision, pure: current is the tree, earned is what the window's commits add to the tag's version.
export const decide = (current: string, earned: string, tag: string | null): Decision => {
  const base = tag === null ? "0.0.0" : tag.replace(/^v/, "")
  if (compare(current, base) < 0) {
    throw new Error(`package.json is at ${current}, below the last release v${base}`)
  }
  const next = compare(current, earned) >= 0 ? current : earned
  return { current, earned, moved: next !== current, next, tag }
}

const run = (cmd: string[], cwd: string): { ok: boolean; out: string } => {
  const proc = Bun.spawnSync(cmd, { cwd, stderr: "pipe", stdout: "pipe" })
  return { ok: proc.exitCode === 0, out: proc.stdout.toString().trim() }
}

const readVersion = async (file: string): Promise<string> =>
  (JSON.parse(await Bun.file(file).text()) as { version: string }).version

// This repo's locked changelogen, anchored to this file rather than resolved from the target's cwd, so a throwaway repository in a test computes with the same binary the workflows use.
const changelogen = join(import.meta.dir, "../../../node_modules/.bin/changelogen")

// changelogen bumps whatever package.json holds and writes the changelog, so it runs against a copy set to the tag's version, and both files are put back afterwards.
const earnedFrom = async (root: string, tag: string | null, current: string): Promise<string> => {
  const pkg = join(root, "package.json")
  const changelog = join(root, "CHANGELOG.md")
  const pkgText = await Bun.file(pkg).text()
  const hadChangelog = await Bun.file(changelog).exists()
  const changelogText = hadChangelog ? await Bun.file(changelog).text() : ""
  const base = tag === null ? "0.0.0" : tag.replace(/^v/, "")
  try {
    await Bun.write(pkg, pkgText.replace(`"version": "${current}"`, `"version": "${base}"`))
    const from = tag === null ? [] : ["--from", tag]
    run(["bun", changelogen, "--bump", "--no-commit", ...from], root)
    return await readVersion(pkg)
  } finally {
    await Bun.write(pkg, pkgText)
    if (hadChangelog) await Bun.write(changelog, changelogText)
    else if (await Bun.file(changelog).exists()) await Bun.file(changelog).delete()
  }
}

// changelogen bumps a patch even for a window of nothing but mechanical commits, so the window is checked first the way auto-release's own gate checks it: with only ci(changelog) and ci(version) commits since the tag, nothing was earned.
const releasable = (root: string, tag: string | null): boolean => {
  const range = tag === null ? ["HEAD"] : [`${tag}..HEAD`]
  const counted = run(
    [
      "git",
      "rev-list",
      "--count",
      "--invert-grep",
      "--grep=^ci(changelog)",
      "--grep=^ci(version)",
      ...range,
    ],
    root,
  )
  return counted.ok && counted.out !== "0"
}

export const decideHere = async (root: string): Promise<Decision> => {
  const described = run(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"], root)
  const tag = described.ok && described.out !== "" ? described.out : null
  const current = await readVersion(join(root, "package.json"))
  const base = tag === null ? "0.0.0" : tag.replace(/^v/, "")
  const earned = releasable(root, tag) ? await earnedFrom(root, tag, current) : base
  return decide(current, earned, tag)
}

if (import.meta.main) {
  const root = process.cwd()
  const decision = await decideHere(root)
  if (decision.moved && process.argv.includes("--write")) {
    const pkg = join(root, "package.json")
    const text = await Bun.file(pkg).text()
    await Bun.write(
      pkg,
      text.replace(`"version": "${decision.current}"`, `"version": "${decision.next}"`),
    )
  }
  console.log(JSON.stringify(decision))
}
