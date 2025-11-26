import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { globby } from "globby"

type DepSections = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies"

const DEP_SECTIONS: DepSections[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]

type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue }

type PackageJson = {
  catalog?: Record<string, JSONValue>
  catalogs?: Record<string, Record<string, JSONValue>>
} & Partial<Record<DepSections, Record<string, string>>>

const isPlainObject = (v: unknown): v is Record<string, JSONValue> =>
  !!v && typeof v === "object" && !Array.isArray(v)

const sortObjectRecursively = <T extends JSONValue>(value: T): T => {
  if (Array.isArray(value)) return value.map(sortObjectRecursively) as T
  if (isPlainObject(value)) {
    const sorted: Record<string, JSONValue> = {}
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortObjectRecursively(value[key])
    }
    return sorted as T
  }
  return value
}

const collectCatalogKeys = (rootPkg: PackageJson): Set<string> => {
  const keys = new Set<string>()
  if (isPlainObject(rootPkg.catalog)) {
    for (const k of Object.keys(rootPkg.catalog)) keys.add(k)
  }
  if (isPlainObject(rootPkg.catalogs)) {
    for (const group of Object.values(rootPkg.catalogs)) {
      if (isPlainObject(group)) {
        for (const k of Object.keys(group)) keys.add(k)
      }
    }
  }
  return keys
}

const isLocalProtocol = (v: string) =>
  v.startsWith("workspace:") ||
  v.startsWith("file:") ||
  v.startsWith("link:") ||
  v.startsWith("portal:")

const readJson = async (path: string): Promise<PackageJson> =>
  JSON.parse(await readFile(path, "utf8"))

async function main() {
  const repoRoot = process.cwd()
  const rootPkgPath = resolve(repoRoot, "package.json")

  const rawRoot = await readFile(rootPkgPath, "utf8")
  const rootPkg = JSON.parse(rawRoot) as PackageJson

  let mutated = false
  if (isPlainObject(rootPkg.catalog)) {
    rootPkg.catalog = sortObjectRecursively(rootPkg.catalog)
    mutated = true
  }
  if (isPlainObject(rootPkg.catalogs)) {
    rootPkg.catalogs = sortObjectRecursively(rootPkg.catalogs)
    mutated = true
  }
  if (mutated) {
    const rawAfter = JSON.stringify(rootPkg, null, 2) + "\n"
    if (rawAfter !== rawRoot) await writeFile(rootPkgPath, rawAfter, "utf8")
  }

  const catalogKeys = collectCatalogKeys(rootPkg)
  if (catalogKeys.size === 0) process.exit(0)

  const pkgPaths = await globby("**/package.json", { gitignore: true })

  const usedDeps = new Set<string>()
  const usedVersions = new Map<string, Set<string>>()

  for (const p of pkgPaths) {
    let pkg: PackageJson
    try {
      pkg = await readJson(resolve(repoRoot, p))
    } catch {
      continue
    }

    for (const section of DEP_SECTIONS) {
      const deps = pkg[section]
      if (!deps || !isPlainObject(deps)) continue

      for (const depName of Object.keys(deps)) {
        const version = deps[depName] as string
        usedDeps.add(depName)
        if (!usedVersions.has(depName)) usedVersions.set(depName, new Set())
        usedVersions.get(depName)!.add(version)
      }
    }
  }

  const unusedCatalog = [...catalogKeys]
    .filter((k) => !usedDeps.has(k))
    .sort((a, b) => a.localeCompare(b))

  const missingInCatalog = [...usedDeps]
    .filter((name) => {
      if (catalogKeys.has(name)) return false
      const versions = [...(usedVersions.get(name) ?? [])]
      return versions.some((v) => !isLocalProtocol(v))
    })
    .sort((a, b) => a.localeCompare(b))

  if (unusedCatalog.length) {
    console.log("Unused deps in catalog:")
    for (const k of unusedCatalog) console.log(`- ${k}`)
    if (missingInCatalog.length) console.log("")
  }

  if (missingInCatalog.length) {
    console.log("Please move following deps to catalog:")
    for (const k of missingInCatalog) console.log(`- ${k}`)
  }

  console.log()
}

main().catch(() => process.exit(1))
