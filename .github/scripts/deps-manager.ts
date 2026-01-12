import { globby } from "globby"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

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

const getOrCreateRootCatalog = (rootPkg: PackageJson) => {
  if (!isPlainObject(rootPkg.catalog)) rootPkg.catalog = {}
  return rootPkg.catalog as Record<string, JSONValue>
}

const pickSafeMoves = (catalogKeys: Set<string>, usedVersions: Map<string, Set<string>>) => {
  const safeToMove: Map<string, string> = new Map()
  const unsafeMissing: string[] = []

  for (const [name, versionsSet] of usedVersions.entries()) {
    if (catalogKeys.has(name)) continue

    const versions = [...versionsSet]
    const nonLocal = versions.filter((v) => !isLocalProtocol(v))

    if (nonLocal.length === 0) continue
    const uniqNonLocal = [...new Set(nonLocal)]
    if (uniqNonLocal.length === 1) {
      safeToMove.set(name, uniqNonLocal[0])
    } else {
      unsafeMissing.push(name)
    }
  }

  return { safeToMove, unsafeMissing }
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

  const catalogKeys = collectCatalogKeys(rootPkg)

  const pkgPaths = await globby("**/package.json", { gitignore: true })
  const { usedDeps, usedVersions } = await scanUsedDeps(repoRoot, pkgPaths)

  const { safeToMove, unsafeMissing } = pickSafeMoves(catalogKeys, usedVersions)

  if (safeToMove.size > 0) {
    const rootCatalog = getOrCreateRootCatalog(rootPkg)
    for (const [name, version] of safeToMove.entries()) {
      rootCatalog[name] = version
      catalogKeys.add(name)
    }
    rootPkg.catalog = sortObjectDeep(rootPkg.catalog!)
    rootMutated = true
  }

  if (rootMutated) {
    await writeJsonFileIfChanged(rootPkgPath, rootPkg, rootRaw)
  }

  for (const relPath of pkgPaths) {
    const absPath = resolve(repoRoot, relPath)
    let raw: string
    let pkg: PackageJson

    try {
      raw = await readFile(absPath, "utf8")
      pkg = JSON.parse(raw) as PackageJson
    } catch {
      continue
    }

    let mutated = false
    for (const section of DEP_SECTIONS) {
      const deps = pkg[section]
      if (!deps || !isPlainObject(deps)) continue

      for (const [name, version] of Object.entries(deps)) {
        if (!safeToMove.has(name)) continue
        if (isLocalProtocol(version)) continue
        if (version !== "catalog:") {
          deps[name] = "catalog:"
          mutated = true
        }
      }

      if (mutated) {
        pkg[section] = sortObjectDeep(deps) as Record<string, string>
      }
    }

    if (mutated) {
      await writeJsonFileIfChanged(absPath, pkg, raw)
    }
  }

  const unusedCatalog = [...catalogKeys]
    .filter((k) => !usedDeps.has(k))
    .sort((a, b) => a.localeCompare(b))

  const missingInCatalog = unsafeMissing.sort((a, b) => a.localeCompare(b))

  if (!unusedCatalog.length && !missingInCatalog.length && safeToMove.size === 0) return

  if (safeToMove.size) {
    console.log("[INFO] Auto-moved deps to catalog:")
    for (const [k, v] of [...safeToMove.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`- ${k}@${v}`)
    }
    console.log("")
  }

  if (unusedCatalog.length) {
    console.log("[INFO] Unused deps in catalog:")
    for (const k of unusedCatalog) console.log(`- ${k}`)
    console.log("")
  }

  if (missingInCatalog.length) {
    console.log("[INFO] Not safe to auto-move. Please move manually:")
    for (const k of missingInCatalog) console.log(`- ${k}`)
    console.log("")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
