import { readdir, rm } from "node:fs/promises"
import { join } from "node:path"

// Remove generated, disposable artifacts (build outputs, caches, codegen) tracked in .gitignore so `bun run clean` gives a fresh tree; user config and secrets stay. Like a `**/` glob, the walk never enters a dot-folder it does not remove, so .git and any nested checkout are left alone. Runs from the repo root (cwd).

const NAMES = new Set([
  ".generated",
  ".next",
  ".playwright-cli",
  ".source",
  ".turbo",
  "bundle",
  "coverage",
  "dist",
  "next-env.d.ts",
  "node_modules",
  "vercel-bundle",
])

const PATHS = [
  "web/next/content/blog/meta.json",
  "web/next/content/console/docs/meta.json",
  "web/next/content/docs/meta.json",
]

const failures: string[] = []

const walk = async (dir: string): Promise<void> => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (NAMES.has(entry.name) || entry.name.endsWith(".tsbuildinfo")) {
      try {
        await rm(path, { force: true, recursive: true })
      } catch (error) {
        failures.push(String(error))
      }
    } else if (entry.isDirectory() && !entry.name.startsWith(".")) await walk(path)
  }
}

const root = process.cwd()
await walk(root)
for (const path of PATHS) {
  try {
    await rm(join(root, path), { force: true })
  } catch (error) {
    failures.push(String(error))
  }
}
if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exitCode = 1
}
