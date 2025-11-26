import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { globby } from "globby"

// TODO: AI-generated script, replace later.

type DepSection = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies"

const DEP_SECTIONS: DepSection[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]

type JSONPrimitive = null | boolean | number | string
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue }

type PackageJson = {
  catalog?: Record<string, JSONValue>
  catalogs?: Record<string, Record<string, JSONValue>>
} & Partial<Record<DepSection, Record<string, string>>>

const isPlainObject = (v: unknown): v is Record<string, JSONValue> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const isLocalProtocol = (v: string) =>
  v.startsWith("workspace:") ||
  v.startsWith("file:") ||
  v.startsWith("link:") ||
  v.startsWith("portal:")

const sortObjectDeep = <T extends JSONValue>(value: T): T => {
  if (Array.isArray(value)) return value.map(sortObjectDeep) as T
  if (isPlainObject(value)) {
    const out: Record<string, JSONValue> = {}
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      out[key] = sortObjectDeep(value[key])
    }
    return out as T
  }
  return value
}

const readJsonFile = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T

const writeJsonFileIfChanged = async (path: string, nextValue: unknown, prevRaw: string) => {
  const nextRaw = JSON.stringify(nextValue, null, 2) + "\n"
  if (nextRaw !== prevRaw) await writeFile(path, nextRaw, "utf8")
}

const collectCatalogKeys = (pkg: PackageJson): Set<string> => {
  const keys = new Set<string>()

  if (isPlainObject(pkg.catalog)) {
    for (const k of Object.keys(pkg.catalog)) keys.add(k)
  }

  if (isPlainObject(pkg.catalogs)) {
    for (const group of Object.values(pkg.catalogs)) {
      if (!isPlainObject(group)) continue
      for (const k of Object.keys(group)) keys.add(k)
    }
  }

  return keys
}

const scanUsedDeps = async (repoRoot: string, pkgPaths: string[]) => {
  const usedDeps = new Set<string>()
  const usedVersions = new Map<string, Set<string>>()

  for (const relPath of pkgPaths) {
    let pkg: PackageJson
    try {
      pkg = await readJsonFile<PackageJson>(resolve(repoRoot, relPath))
    } catch {
      continue
    }

    for (const section of DEP_SECTIONS) {
      const deps = pkg[section]
      if (!deps || !isPlainObject(deps)) continue

      for (const [name, version] of Object.entries(deps)) {
        usedDeps.add(name)
        let versions = usedVersions.get(name)
        if (!versions) usedVersions.set(name, (versions = new Set()))
        versions.add(version)
      }
    }
  }

  return { usedDeps, usedVersions }
}

async function main() {
  const repoRoot = process.cwd()
  const rootPkgPath = resolve(repoRoot, "package.json")

  const rootRaw = await readFile(rootPkgPath, "utf8")
  const rootPkg = JSON.parse(rootRaw) as PackageJson

  let rootMutated = false
  if (isPlainObject(rootPkg.catalog)) {
    rootPkg.catalog = sortObjectDeep(rootPkg.catalog)
    rootMutated = true
  }
  if (isPlainObject(rootPkg.catalogs)) {
    rootPkg.catalogs = sortObjectDeep(rootPkg.catalogs)
    rootMutated = true
  }
  if (rootMutated) await writeJsonFileIfChanged(rootPkgPath, rootPkg, rootRaw)

  const catalogKeys = collectCatalogKeys(rootPkg)
  if (catalogKeys.size === 0) return

  const pkgPaths = await globby("**/package.json", { gitignore: true })
  const { usedDeps, usedVersions } = await scanUsedDeps(repoRoot, pkgPaths)

  const unusedCatalog = [...catalogKeys]
    .filter((k) => !usedDeps.has(k))
    .sort((a, b) => a.localeCompare(b))

  const missingInCatalog = [...usedDeps]
    .filter((name) => {
      if (catalogKeys.has(name)) return false
      const versions = usedVersions.get(name)
      if (!versions) return false
      return [...versions].some((v) => !isLocalProtocol(v))
    })
    .sort((a, b) => a.localeCompare(b))

  if (!unusedCatalog.length && !missingInCatalog.length) return

  if (unusedCatalog.length) {
    console.log("Unused deps in catalog:")
    for (const k of unusedCatalog) console.log(`- ${k}`)
    console.log("")
  }

  if (missingInCatalog.length) {
    console.log("Please move following deps to catalog:")
    for (const k of missingInCatalog) console.log(`- ${k}`)
    console.log("")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
