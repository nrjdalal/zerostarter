import { describe, expect, test } from "bun:test"

import { CONSOLE_ROLES } from "../../../packages/auth/src/access"
import { ACTIVITY_ACTIONS } from "../../../packages/config/src/console"

// The script cannot import the ladder: it runs from the repo root, and giving @packages/scripts a dependency on @packages/auth is a build cycle. So it restates the grantable rungs, and this is what keeps the restatement honest.
const source = await Bun.file(
  new URL("../../../.github/scripts/console-roles.ts", import.meta.url),
).text()
const writerSource = await Bun.file(
  new URL("../../../packages/db/src/console.ts", import.meta.url),
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

  // It restates the activity write for the same reason it restates the rungs, so the same kind of guard applies: an action nothing else writes, or a summary shaped differently from every other role change, would leave the trail inconsistent with no compile error to say so.
  test("the action it records is one the rest of the app knows", () => {
    const match = source.match(/INSERT INTO activity[\s\S]*?VALUES[\s\S]*?\}/)
    expect(match).not.toBeNull()
    expect(source).toContain('${"role.change"}')
    expect(ACTIVITY_ACTIONS).toContain("role.change")
  })

  test("its summary is shaped exactly like the one the console writes", () => {
    // Compared as source, not by calling roleChangeSummary: importing @packages/db here would pull its @/ paths into this slice's program, and the fix for that is not to bend a shared tsconfig around a test.
    // Both are reduced to their shape, so different variable names on the same sentence still match and a reordered or repunctuated one does not.
    const shapes = (text: string) =>
      [...text.matchAll(/`([^`]*\$\{[^`]*)`/g)]
        .map((match) => match[1].replace(/\$\{[^}]*\}/g, "%s"))
        // Sentences, not the script's SQL: a statement is multi-line and shouts its verb.
        .filter((shape) => !shape.includes("\n") && !/^[A-Z]+ /.test(shape) && shape.includes("%s"))
    // The three sentences the script restates, pinned as literals so a rewording on either side fails the test.
    // Containment on both sides, not equality: the script also has its own console output, and the writer owns sentences for bans and rule edits that the script never writes. Equality here meant adding any unrelated sentence to the writer broke this test.
    // What each sentence reads as is tested against the functions themselves in tests/packages/db/src/console.test.ts; this is only the drift guard between the two files.
    const rungSentences = ["Confirmed %s at %s", "Changed %s from %s to %s", "Set %s to %s"]
    expect(shapes(writerSource)).toEqual(expect.arrayContaining(rungSentences))
    expect(shapes(source)).toEqual(expect.arrayContaining(rungSentences))
  })

  test("the rung change and its line commit together", () => {
    // The whole point of the trail: this script must not be the one path where a change can happen unrecorded.
    expect(source).toContain("await sql.begin(")
    const body = source.slice(source.indexOf("await sql.begin("))
    expect(body).toContain("INSERT INTO activity")
    expect(body).toContain("FOR UPDATE")
  })
})
