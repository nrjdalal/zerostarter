import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export const exists = (path: string): boolean => existsSync(path)

export const read = (path: string): string => readFileSync(path, "utf8")

export const write = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

export const remove = (path: string): void => {
  rmSync(path, { force: true, recursive: true })
}

// Build output and vendored deps: wiped or skipped wholesale by emptyDir/findPackageJsons.
const HEAVY_DIRS = new Set(["node_modules", ".next", ".turbo", "dist"])

// Remove everything except the repo's top-level .git and .env* files (any depth) outside the heavy build dirs, which are wiped wholesale. Only the top-level .git is kept: a nested .git is an embedded git repo (e.g. a gitignored test fixture) and is wiped like any other directory, so a later `git add -A` does not choke on it.
export const emptyDir = (dir: string, isRoot = true): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.name === ".git") {
      if (isRoot) continue
      rmSync(path, { force: true, recursive: true })
      continue
    }
    if (entry.isDirectory()) {
      if (HEAVY_DIRS.has(entry.name)) {
        rmSync(path, { force: true, recursive: true })
      } else {
        emptyDir(path, false)
        if (readdirSync(path).length === 0) rmSync(path, { force: true, recursive: true })
      }
    } else if (!entry.name.startsWith(".env")) {
      rmSync(path, { force: true })
    }
  }
}

// List every package.json under `dir`, skipping .git and heavy build/vendor dirs.
export const findPackageJsons = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || HEAVY_DIRS.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findPackageJsons(path))
    else if (entry.name === "package.json") out.push(path)
  }
  return out
}

export const readJson = <T = Record<string, unknown>>(path: string): T =>
  JSON.parse(read(path)) as T

export const writeJson = (path: string, value: unknown): void => {
  write(path, `${JSON.stringify(value, null, 2)}\n`)
}

// Remove the first match of `pattern` from a file in place. Returns true if anything was removed.
export const removeMatch = (path: string, pattern: RegExp): boolean => {
  if (!existsSync(path)) return false
  const before = read(path)
  const after = before.replace(pattern, "")
  if (after === before) return false
  writeFileSync(path, after)
  return true
}
