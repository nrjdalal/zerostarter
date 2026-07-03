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

// Remove every entry in `dir` except .git and any .env* file, preserving git history and local secrets.
export const emptyDir = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry.startsWith(".env")) continue
    rmSync(join(dir, entry), { force: true, recursive: true })
  }
}

export const readJson = <T = Record<string, unknown>>(path: string): T =>
  JSON.parse(read(path)) as T

export const writeJson = (path: string, value: unknown): void => {
  write(path, `${JSON.stringify(value, null, 2)}\n`)
}

// Apply literal substring replacements to a file in place. Returns true if anything changed.
export const replaceInFile = (path: string, pairs: Array<[string, string]>): boolean => {
  if (!existsSync(path)) return false
  const before = read(path)
  let after = before
  for (const [from, to] of pairs) after = after.split(from).join(to)
  if (after === before) return false
  writeFileSync(path, after)
  return true
}
