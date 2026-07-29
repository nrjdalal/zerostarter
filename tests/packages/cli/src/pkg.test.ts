import { describe, expect, test } from "bun:test"

import { merge, mergePkg, type Pkg, unionArrays } from "../../../../packages/cli/src/pkg"

describe("merge", () => {
  test("later object wins on shared keys and both extras are kept", () => {
    expect(merge({ a: "1", b: "1" }, { b: "2", c: "2" })).toEqual({ a: "1", b: "2", c: "2" })
  })

  test("undefined when both sides are empty or absent", () => {
    expect(merge(undefined, undefined)).toBeUndefined()
    expect(merge({}, {})).toBeUndefined()
  })

  test("handles one side undefined", () => {
    expect(merge({ a: "1" }, undefined)).toEqual({ a: "1" })
    expect(merge(undefined, { b: "2" })).toEqual({ b: "2" })
  })
})

describe("unionArrays", () => {
  test("unions with starter entries first and dedupes", () => {
    expect(unionArrays(["web/*", "apps/*"], ["api/*", "web/*"])).toEqual([
      "api/*",
      "web/*",
      "apps/*",
    ])
  })

  test("undefined when neither side is an array", () => {
    expect(unionArrays(undefined, undefined)).toBeUndefined()
    expect(unionArrays({ packages: [] }, undefined)).toBeUndefined()
  })

  test("handles one side missing", () => {
    expect(unionArrays(["apps/*"], undefined)).toEqual(["apps/*"])
    expect(unionArrays(undefined, ["api/*"])).toEqual(["api/*"])
  })
})

describe("mergePkg", () => {
  const root = (fork: Pkg, starter: Pkg) => mergePkg(fork, starter, true)
  const ws = (fork: Pkg, starter: Pkg) => mergePkg(fork, starter, false)

  test("keeps the fork's added product deps and takes the starter's latest shared versions", () => {
    const out = ws(
      { dependencies: { stripe: "catalog:", react: "18.0.0" } },
      { dependencies: { react: "18.3.0", next: "catalog:" } },
    )
    expect(out.dependencies).toEqual({ stripe: "catalog:", react: "18.3.0", next: "catalog:" })
  })

  test("keeps fork-only top-level keys the starter does not define", () => {
    const out = ws({ name: "web", browserslist: ["last 2 versions"] }, { name: "web" })
    expect(out.browserslist).toEqual(["last 2 versions"])
  })

  test("unions workspaces so a fork's added area survives a re-baseline", () => {
    const out = root(
      { workspaces: ["api/*", "packages/*", "web/*", "apps/*"] },
      { workspaces: ["api/*", "packages/*", "web/*"] },
    )
    expect(out.workspaces).toEqual(["api/*", "packages/*", "web/*", "apps/*"])
  })

  test("overrides is starter-wins so a CVE bump propagates while fork pins are kept", () => {
    const out = root(
      { overrides: { esbuild: "0.19-pin", axios: "fork-pin" } },
      { overrides: { esbuild: "0.21-cvefix" } },
    )
    expect(out.overrides).toEqual({ axios: "fork-pin", esbuild: "0.21-cvefix" })
  })

  test("scripts is starter-wins so an upstream fix propagates while fork extras are kept", () => {
    const out = root(
      { scripts: { dev: "old", deploy: "vercel" } },
      { scripts: { dev: "new", build: "turbo" } },
    )
    expect(out.scripts).toEqual({ dev: "new", build: "turbo", deploy: "vercel" })
  })

  test("root keeps the fork's name/version and drops starter author fields the fork lacks", () => {
    const out = root(
      { name: "myapp", version: "1.2.0" },
      { name: "zerostarter", version: "0.0.0", author: "nrjdalal", homepage: "x" },
    )
    expect(out.name).toBe("myapp")
    expect(out.version).toBe("1.2.0")
    expect(out.author).toBeUndefined()
    expect(out.homepage).toBeUndefined()
  })

  test("root restores the fork's own author/repository when it set them", () => {
    const out = root(
      { name: "myapp", author: "Jane", repository: "github.com/jane/myapp" },
      { name: "zerostarter", author: "nrjdalal" },
    )
    expect(out.author).toBe("Jane")
    expect(out.repository).toBe("github.com/jane/myapp")
  })

  test("a workspace manifest keeps the starter's package name (no identity loop)", () => {
    const out = ws({ name: "@apps/web-old" }, { name: "@apps/web" })
    expect(out.name).toBe("@apps/web")
  })

  test("packageManager and commitlint take the starter's latest (re-baseline)", () => {
    const out = root(
      { packageManager: "bun@1.2.0" },
      { packageManager: "bun@1.3.14", commitlint: { extends: ["x"] } },
    )
    expect(out.packageManager).toBe("bun@1.3.14")
    expect(out.commitlint).toEqual({ extends: ["x"] })
  })

  test("description is not stripped: it keeps the starter's, matching init", () => {
    const out = root({ name: "myapp", description: "stale" }, { name: "z", description: "latest" })
    expect(out.description).toBe("latest")
  })

  test("merges optionalDependencies (the takumi natives case): fork extras survive", () => {
    const out = ws(
      { optionalDependencies: { "@takumi-rs/core-linux": "1.0.0", "fork-opt": "2.0.0" } },
      {
        optionalDependencies: {
          "@takumi-rs/core-linux": "1.1.0",
          "@takumi-rs/core-darwin": "1.1.0",
        },
      },
    )
    expect(out.optionalDependencies).toEqual({
      "@takumi-rs/core-linux": "1.1.0",
      "@takumi-rs/core-darwin": "1.1.0",
      "fork-opt": "2.0.0",
    })
  })

  test("merges peerDependencies and resolutions too", () => {
    const out = ws(
      { peerDependencies: { react: "18" }, resolutions: { "fork-res": "1" } },
      { peerDependencies: { next: "15" } },
    )
    expect(out.peerDependencies).toEqual({ react: "18", next: "15" })
    expect(out.resolutions).toEqual({ "fork-res": "1" })
  })

  test("does not write empty dependency objects when neither side has any", () => {
    const out = ws({ name: "web" }, { name: "web" })
    expect("dependencies" in out).toBe(false)
  })
})
