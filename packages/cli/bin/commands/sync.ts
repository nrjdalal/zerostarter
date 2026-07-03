import { join, resolve } from "node:path"

import { fixDangling } from "@/convert"
import { bunInstall, fetchGitpickignore, gitIsClean, gitRestore, overlayZerostarter } from "@/git"
import { exists, readJson, remove, writeJson } from "@/io"

import { orange, yellow } from "./_prompt"

interface Pkg {
  name?: string
  version?: string
  scripts?: Record<string, unknown>
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  overrides?: Record<string, unknown>
  catalog?: Record<string, unknown>
  [key: string]: unknown
}

// The paths sync restores after the overlay are declared once in the starter's .gitpickignore as
// `# PRESERVE_ON_SYNC - <comma-separated>` (files init seeds but a fork keeps: favicon, audit record).
const parsePreserve = (gitpickignore: string): string[] => {
  const marker = "# PRESERVE_ON_SYNC"
  const line = gitpickignore.split("\n").find((l) => l.trim().startsWith(marker))
  if (!line) return []
  return line
    .trim()
    .slice(marker.length)
    .replace(/^\s*-\s*/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Merge two package.json object fields. Later wins on shared keys; returns undefined when neither
// side has anything, so an absent field is never written back as an empty `{}`.
const merge = (first: unknown, second: unknown): Record<string, unknown> | undefined => {
  const both = { ...(first as Record<string, unknown>), ...(second as Record<string, unknown>) }
  return Object.keys(both).length > 0 ? both : undefined
}

// Re-baseline an existing fork on the latest ZeroStarter: a gitpick overlay updates the starter
// files while the starter's .gitpickignore keeps the fork's content, public/marketing, and site.ts.
// fixDangling reconciles files that mix shared and author-only code; the fork owns its package.json.
export const sync = async (argv: string[]) => {
  const target = resolve(argv[0] ?? ".")

  if (!exists(join(target, ".git"))) {
    throw new Error(`No git repository in ${target}. Run sync inside an existing fork.`)
  }
  if (!gitIsClean(target)) {
    throw new Error(
      "Working tree has uncommitted changes. Commit or stash them first so the sync lands as a reviewable diff.",
    )
  }

  const pkgPath = join(target, "package.json")
  const forkPkg = exists(pkgPath) ? readJson<Pkg>(pkgPath) : null

  // Read the preserve directive up front from the starter's .gitpickignore (gitpick never copies it
  // into a fork). Fail here, before the overlay, so a fetch error never leaves the fork half-synced.
  const preserve = parsePreserve(await fetchGitpickignore())

  console.log()
  console.log(
    "Overlaying the latest ZeroStarter (content, public/marketing, and site.ts preserved) ...",
  )
  overlayZerostarter(target)

  // The overlay re-added files that mix shared and author-only code (fonts.ts, navbar/home.tsx).
  // Reconcile them exactly as init does, or the fork references the excluded fonts / hire route.
  fixDangling(target)

  // gitpick never copies the ignore file, but drop any that slipped through.
  remove(join(target, ".gitpickignore"))

  // The overlay replaced package.json with the starter's. The fork owns its package.json (name,
  // identity, workspaces, overrides, ...), so keep all of it and pull in only the starter's latest
  // dependency versions plus any new scripts.
  if (forkPkg && exists(pkgPath)) {
    const starterPkg = readJson<Pkg>(pkgPath)
    const next: Pkg = { ...forkPkg }
    // Starter wins on shared keys (latest versions/pins); the fork's extras are kept.
    const deps = merge(forkPkg.dependencies, starterPkg.dependencies)
    const devDeps = merge(forkPkg.devDependencies, starterPkg.devDependencies)
    const overrides = merge(forkPkg.overrides, starterPkg.overrides)
    const catalog = merge(forkPkg.catalog, starterPkg.catalog)
    // Scripts: the fork's custom or modified scripts win; new starter scripts are added.
    const scripts = merge(starterPkg.scripts, forkPkg.scripts)
    if (deps) next.dependencies = deps
    if (devDeps) next.devDependencies = devDeps
    if (overrides) next.overrides = overrides
    if (catalog) next.catalog = catalog
    if (scripts) next.scripts = scripts
    writeJson(pkgPath, next)
  }

  // Restore the fork-owned local files the .gitpickignore directive names (favicon, audit record).
  gitRestore(target, preserve)

  console.log("Installing dependencies ...")
  bunInstall(target)

  console.log()
  console.log(orange("Synced to the latest ZeroStarter."))
  console.log(
    "Starter files were updated (edits to them were overwritten); files you added and your",
  )
  console.log("content, public/marketing, and branding were preserved.")
  console.log(yellow(`Review the diff and commit: git -C ${target} status`))
}
