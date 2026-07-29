import { describe, expect, test } from "bun:test"

// The auto-move step cannot be imported: deps-manager is a top-level script whose helpers are module-private and whose main() rewrites every package.json on disk. So this reads the source, the same way console-roles.test.ts does.
const source = await Bun.file(
  new URL("../../../.github/scripts/deps-manager.ts", import.meta.url),
).text()

const rootPkg = (await Bun.file(new URL("../../../package.json", import.meta.url)).json()) as {
  catalog: Record<string, string>
  catalogs?: Record<string, Record<string, string>>
}

const webNextPkg = (await Bun.file(
  new URL("../../../web/next/package.json", import.meta.url),
).json()) as { devDependencies: Record<string, string> }

describe("deps-manager", () => {
  test("it leaves a named-catalog reference alone instead of collapsing it to catalog:", () => {
    expect(source).toContain('if (!version.startsWith("catalog:")) {')
    expect(source).not.toContain('if (version !== "catalog:") {')
  })

  test("it walks the named catalogs alongside the main one, so the caret rule covers both", () => {
    expect(source).toContain("if (isPlainObject(pkg.catalog)) catalogs.push(pkg.catalog)")
    expect(source).toContain("if (isPlainObject(pkg.catalogs)) {")
  })

  test("every named-catalog entry is a caret range, like the main catalog", () => {
    for (const [name, group] of Object.entries(rootPkg.catalogs ?? {})) {
      for (const [dep, spec] of Object.entries(group)) {
        expect(spec, `catalogs.${name}.${dep}`).toMatch(/^\^\d+\.\d+\.\d+/)
      }
    }
  })
})

// next build type-checks through the TypeScript JS API, which the native typescript 7 package does not ship. Pointing web/next back at the main catalog silently turns that check off rather than failing, so it is worth a test.
describe("the typescript 6 exception for web/next", () => {
  test("web/next takes typescript from the next catalog", () => {
    expect(webNextPkg.devDependencies.typescript).toBe("catalog:next")
  })

  test("the next catalog pins typescript 6, and the main catalog stays on 7", () => {
    expect(rootPkg.catalogs?.next?.typescript).toMatch(/^\^6\./)
    expect(rootPkg.catalog.typescript).toMatch(/^\^7\./)
  })

  test("no workspace depends on the retired tsgo preview", () => {
    expect(JSON.stringify(rootPkg)).not.toContain("@typescript/native-preview")
  })
})
