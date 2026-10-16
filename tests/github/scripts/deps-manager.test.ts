import { expect, test } from "bun:test"

import {
  normalizeCatalogRanges,
  pickSafeMoves,
  sortObjectDeep,
  toCaretRange,
  type PackageJson,
} from "../../../.github/scripts/deps-manager"

test("an exact and a tilde spec both become caret ranges", () => {
  expect(toCaretRange("1.2.3")).toBe("^1.2.3")
  expect(toCaretRange("~1.2.3")).toBe("^1.2.3")
  expect(toCaretRange("1.2")).toBe("^1.2")
})

test("a prerelease and a build suffix survive the caret rewrite", () => {
  expect(toCaretRange("7.0.0-dev.20260519.1")).toBe("^7.0.0-dev.20260519.1")
  expect(toCaretRange("1.2.3+build.5")).toBe("^1.2.3+build.5")
  expect(toCaretRange("~1.2.3-beta.1")).toBe("^1.2.3-beta.1")
})

test("a spec that is not a plain version has no caret form", () => {
  for (const spec of ["*", "latest", ">=1 <2", "1.x", "^1.2.3 || ^2"]) {
    expect(toCaretRange(spec)).toBeNull()
  }
})

test("catalog normalization rewrites exact and tilde specs in every catalog", () => {
  const pkg: PackageJson = {
    catalog: { hono: "4.12.16", zod: "~4.4.3", react: "^19.2.5" },
    catalogs: { tooling: { tsdown: "0.21.10" } },
  }
  const { rewritten, manual } = normalizeCatalogRanges(pkg)
  expect(pkg.catalog).toEqual({ hono: "^4.12.16", zod: "^4.4.3", react: "^19.2.5" })
  expect(pkg.catalogs).toEqual({ tooling: { tsdown: "^0.21.10" } })
  expect(rewritten).toEqual([
    { name: "hono", from: "4.12.16", to: "^4.12.16" },
    { name: "tsdown", from: "0.21.10", to: "^0.21.10" },
    { name: "zod", from: "~4.4.3", to: "^4.4.3" },
  ])
  expect(manual).toEqual([])
})

test("workspace, npm, git and URL specs are left alone", () => {
  const specs = {
    a: "workspace:*",
    b: "npm:other-package@^1.0.0",
    c: "git+ssh://git@github.com/owner/repo.git",
    d: "https://example.com/pkg.tgz",
    e: "owner/repo",
  }
  const pkg: PackageJson = { catalog: { ...specs } }
  const { rewritten, manual } = normalizeCatalogRanges(pkg)
  expect(pkg.catalog).toEqual(specs)
  expect(rewritten).toEqual([])
  expect(manual).toEqual([])
})

test("a wildcard, a dist-tag and a compound range are reported, not rewritten", () => {
  const pkg: PackageJson = { catalog: { any: "*", next: "canary", pair: ">=1 <2" } }
  const { rewritten, manual } = normalizeCatalogRanges(pkg)
  expect(pkg.catalog).toEqual({ any: "*", next: "canary", pair: ">=1 <2" })
  expect(rewritten).toEqual([])
  expect(manual).toEqual([
    { name: "any", spec: "*" },
    { name: "next", spec: "canary" },
    { name: "pair", spec: ">=1 <2" },
  ])
})

test("a dependency every workspace pins the same way is promoted to the catalog", () => {
  const used = new Map([
    ["nanoid", new Set(["^5.1.9"])],
    ["local", new Set(["workspace:*"])],
    ["mixed", new Set(["workspace:*", "^2.0.0"])],
  ])
  const { safeToMove, unsafeMissing } = pickSafeMoves(new Set(), used)
  expect([...safeToMove]).toEqual([
    ["nanoid", "^5.1.9"],
    ["mixed", "^2.0.0"],
  ])
  expect(unsafeMissing).toEqual([])
})

test("a dependency pinned at two versions across workspaces is reported, not promoted", () => {
  const used = new Map([["zod", new Set(["^4.4.3", "^3.25.0"])]])
  const { safeToMove, unsafeMissing } = pickSafeMoves(new Set(), used)
  expect(safeToMove.size).toBe(0)
  expect(unsafeMissing).toEqual(["zod"])
})

test("a dependency already in the catalog is not moved again", () => {
  const used = new Map([["hono", new Set(["4.12.16"])]])
  const { safeToMove, unsafeMissing } = pickSafeMoves(new Set(["hono"]), used)
  expect(safeToMove.size).toBe(0)
  expect(unsafeMissing).toEqual([])
})

test("object keys sort at every depth while array order is kept", () => {
  const sorted = sortObjectDeep({ z: 1, a: { d: [3, 1, 2], b: { y: true, c: null } } })
  expect(JSON.stringify(sorted)).toBe('{"a":{"b":{"c":null,"y":true},"d":[3,1,2]},"z":1}')
})
