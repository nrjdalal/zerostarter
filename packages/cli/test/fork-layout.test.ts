import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parseForkLayout } from "@/fork-layout"

describe("parseForkLayout", () => {
  test("collects the literal exclude paths, skipping comments and blank lines", () => {
    const gpi = [
      "# custom directories",
      "",
      "web/next/content/",
      "packages/cli/",
      "# custom files",
      "LICENSE.md",
    ].join("\n")
    expect(parseForkLayout(gpi).excludes).toEqual([
      "web/next/content/",
      "packages/cli/",
      "LICENSE.md",
    ])
  })

  test("extracts the comma-separated PRESERVE_ON_SYNC paths", () => {
    const gpi =
      "# header\n# PRESERVE_ON_SYNC - bun.lock, web/next/src/app/favicon.ico, web/next/src/app/icon.svg\nweb/next/content/"
    expect(parseForkLayout(gpi).preserve).toEqual([
      "bun.lock",
      "web/next/src/app/favicon.ico",
      "web/next/src/app/icon.svg",
    ])
  })

  test("keeps the PRESERVE_ON_SYNC directive line out of the excludes", () => {
    const layout = parseForkLayout("web/next/content/\n# PRESERVE_ON_SYNC - bun.lock")
    expect(layout.excludes).toEqual(["web/next/content/"])
    expect(layout.preserve).toEqual(["bun.lock"])
  })

  test("preserve is [] when the directive is absent", () => {
    expect(parseForkLayout("# just a comment\nweb/next/content/").preserve).toEqual([])
  })

  test("tolerates extra whitespace and a trailing comma in the directive", () => {
    expect(parseForkLayout("# PRESERVE_ON_SYNC   -   a.md ,  b.txt , ").preserve).toEqual([
      "a.md",
      "b.txt",
    ])
  })

  test("ignores a non-comment line that merely mentions the marker", () => {
    expect(parseForkLayout("PRESERVE_ON_SYNC - x").preserve).toEqual([])
  })

  test("the checked-in .gitpickignore has only literal excludes and the expected preserve set", () => {
    const { excludes, preserve } = parseForkLayout(
      readFileSync(join(import.meta.dir, "../../../.gitpickignore"), "utf8"),
    )
    // A glob exclude would make fork `init` throw at the guard in convert.ts; catch it in CI, not on a fork user's machine.
    for (const path of excludes) expect(path).not.toMatch(/[*?![\]]/)
    // The fork-owned paths sync restores after the overlay; drift here silently overwrites a fork's own DB state, lockfile, or docs config.
    expect(preserve).toEqual([
      "bun.lock",
      "packages/db/drizzle/",
      "packages/db/src/schema/",
      "web/next/docs.config.ts",
      "web/next/src/app/favicon.ico",
    ])
  })
})
