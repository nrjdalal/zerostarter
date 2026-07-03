import { join, resolve } from "node:path"

import { fixDangling } from "@/convert"
import {
  bunInstall,
  fetchGitpickignore,
  gitIsClean,
  gitResetHard,
  gitRestore,
  overlayZerostarter,
} from "@/git"
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

// Parse the "# PRESERVE_ON_SYNC - <paths>" directive from the starter's .gitpickignore.
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

// Merge two package.json object fields (later wins shared keys); undefined when both empty.
const merge = (first: unknown, second: unknown): Record<string, unknown> | undefined => {
  const both = { ...(first as Record<string, unknown>), ...(second as Record<string, unknown>) }
  return Object.keys(both).length > 0 ? both : undefined
}

// Re-baseline a fork on the latest ZeroStarter, preserving its content, branding, and package.json.
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

  // Read the preserve directive before the overlay, so a fetch error aborts before mutating the fork.
  const preserve = parsePreserve(await fetchGitpickignore())

  console.log()
  console.log(
    "Overlaying the latest ZeroStarter (content, public/marketing, and site.ts preserved) ...",
  )

  // Run overlay + reconcile atomically; roll back to the pre-sync commit on any failure (tree was clean).
  try {
    overlayZerostarter(target)

    // Reconcile files the overlay re-added that mix shared + author-only code (fonts.ts, navbar), as init does.
    fixDangling(target)

    // gitpick never copies the ignore file, but drop any that slipped through.
    remove(join(target, ".gitpickignore"))

    // The fork owns its package.json; keep it all, pulling in only the starter's latest deps + new scripts.
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
  } catch (err) {
    gitResetHard(target)
    console.log(yellow("Sync failed; rolled the working tree back to your last commit."))
    throw err
  }

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
