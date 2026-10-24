import { existsSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { Glob } from "bun"

// Writes every workspace's tsconfig.json, type-check devDependencies and check-types script, the .github/scripts tsconfig and every tests/**/tsconfig.json from template.json. A target that must differ says so in its own patch beside the template, named by its path (web/next is web-next.json), deep-merged over the template: an object merges, anything else replaces, null removes the key. packages/config is skipped, since its tsconfig.json is the base every other one extends. --check writes nothing and exits 1 naming each file that drifted. Runs from the repo root (cwd).

type Json = { [key: string]: unknown }

const here = join(import.meta.dir, "sync-config")
const root = process.cwd()
const check = process.argv.includes("--check")

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const merge = (base: Json, patch: Json): Json => {
  const out: Json = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key]
    else out[key] = isObject(value) && isObject(out[key]) ? merge(out[key], value) : value
  }
  return out
}

const sortKeys = (value: Json): Json =>
  Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))

// Order-blind, so the formatter's layout and key order are never drift.
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, v) => (isObject(v) ? sortKeys(v) : v))

const readJson = async (path: string): Promise<Json | undefined> => {
  if (!existsSync(path)) return undefined
  try {
    return await Bun.file(path).json()
  } catch {
    return undefined
  }
}

const template = (await Bun.file(join(here, "template.json")).json()) as Record<
  "package" | "tests" | "tsconfig",
  Json
>

const patchFor = async (dir: string) =>
  ((await readJson(join(here, `${dir.replace(/^\./, "").replaceAll("/", "-")}.json`))) ?? {}) as {
    package?: Json
    tsconfig?: Json
  }

const tsconfig = (base: Json, patch?: Json): Json => {
  const merged = merge(base, patch ?? {})
  return { ...merged, compilerOptions: sortKeys(merged.compilerOptions as Json) }
}

const expected = new Map<string, Json>()

const rootPackage = (await Bun.file(join(root, "package.json")).json()) as { workspaces: string[] }
for (const pattern of rootPackage.workspaces) {
  for await (const file of new Glob(`${pattern}/package.json`).scan({ cwd: root })) {
    const dir = dirname(file)
    const pkg = (await readJson(join(root, file))) as Json
    if (pkg.name === "@packages/config") continue
    const patch = await patchFor(dir)
    const wanted = merge(template.package, patch.package ?? {})
    const runtime = (pkg.dependencies ?? {}) as Json
    const devDependencies = { ...(pkg.devDependencies as Json) }
    for (const [name, version] of Object.entries(wanted.devDependencies as Json)) {
      if (!(name in runtime)) devDependencies[name] = version
    }
    expected.set(file, {
      ...pkg,
      devDependencies: sortKeys(devDependencies),
      scripts: { ...(pkg.scripts as Json), ...(wanted.scripts as Json) },
    })
    expected.set(`${dir}/tsconfig.json`, tsconfig(template.tsconfig, patch.tsconfig))
  }
}

if (existsSync(join(root, ".github/scripts"))) {
  const patch = await patchFor(".github/scripts")
  expected.set(".github/scripts/tsconfig.json", tsconfig(template.tsconfig, patch.tsconfig))
}

// Each test folder extends its subject's own config, so the source it imports resolves its @/ paths; tests/github/<x> mirrors .github/<x>.
for await (const file of new Glob("tests/**/tsconfig.json").scan({ cwd: root })) {
  const dir = dirname(file)
  const subject = dir.replace(/^tests\//, "").replace(/^github\//, ".github/")
  const patch = await patchFor(dir)
  const extendsPath = `${relative(dir, subject)}/tsconfig.json`
  expected.set(file, tsconfig({ extends: extendsPath, ...template.tests }, patch.tsconfig))
}

const drifted: string[] = []
for (const file of [...expected.keys()].sort()) {
  if (canonical(await readJson(join(root, file))) !== canonical(expected.get(file)))
    drifted.push(file)
}

if (check) {
  if (drifted.length) {
    console.error("sync:config: drifted from the template (bun run sync:config rewrites them):")
    for (const file of drifted) console.error(`  ${file}`)
    process.exit(1)
  }
  process.exit(0)
}

for (const file of drifted)
  await Bun.write(join(root, file), `${JSON.stringify(expected.get(file), null, 2)}\n`)
if (drifted.length) {
  const format = Bun.spawnSync(["bun", "run", "format", ...drifted], {
    cwd: root,
    stdio: ["inherit", "inherit", "inherit"],
  })
  if (format.exitCode !== 0) process.exit(format.exitCode)
}
console.log(`sync:config: ${drifted.length} file(s) written`)
