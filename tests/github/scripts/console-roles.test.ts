import { describe, expect, test } from "bun:test"

import { CONSOLE_ROLES } from "../../../packages/auth/src/access"

// The script cannot import the ladder: it runs from the repo root, and giving @packages/scripts a dependency on @packages/auth is a build cycle. So it restates the grantable rungs, and this is what keeps the restatement honest.
const source = await Bun.file(
  new URL("../../../.github/scripts/console-roles.ts", import.meta.url),
).text()

describe("console-roles", () => {
  test("its grantable rungs are the ladder without the rung that means no console", () => {
    const match = source.match(/const GRANTABLE = \[([^\]]*)\]/)
    expect(match).not.toBeNull()
    const grantable = [...(match as RegExpMatchArray)[1].matchAll(/"([^"]+)"/g)].map(
      (entry) => entry[1],
    )
    expect(grantable).toEqual(CONSOLE_ROLES.filter((role) => role !== "user"))
  })

  test("revoke sets the rung the ladder reads as no console access", () => {
    expect(source).toContain('action === "grant" ? granted : "user"')
    expect(CONSOLE_ROLES).toContain("user")
  })
})
