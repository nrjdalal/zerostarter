import { describe, expect, test } from "bun:test"

import {
  allowlistAddSummary,
  allowlistRemoveSummary,
  banSummary,
  roleChangeSummary,
  unbanSummary,
  waitlistRemoveSummary,
} from "../../../../packages/db/src/console"

// These sentences are what a console reader actually reads, and what a pasted line carries with no column beside it, so they are worth pinning rather than only comparing between files.
describe("activity summaries", () => {
  test("a rung change names both ends of it", () => {
    expect(roleChangeSummary("ada@example.com", "member", "admin")).toBe(
      "Changed ada@example.com from member to admin",
    )
  })

  test("an account with no rung yet is set, not changed", () => {
    expect(roleChangeSummary("ada@example.com", null, "member")).toBe(
      "Set ada@example.com to member",
    )
  })

  test("a rung set to the one it already had is confirmed, not changed", () => {
    // Nothing refuses this, and it still stamps role_set_at, so it earns a line. It must not claim a change it did not make.
    expect(roleChangeSummary("ada@example.com", "member", "member")).toBe(
      "Confirmed ada@example.com at member",
    )
  })

  test("a ban says it ended their sessions, because it did", () => {
    expect(banSummary("katherine@example.com")).toBe(
      "Banned katherine@example.com, ending their sessions",
    )
    expect(unbanSummary("katherine@example.com")).toBe("Unbanned katherine@example.com")
  })

  test("a rule edit says which list it was", () => {
    expect(allowlistAddSummary("@example.com")).toBe("Added @example.com to the allowlist")
    expect(allowlistRemoveSummary("@example.com")).toBe("Removed @example.com from the allowlist")
  })

  test("a removed signup names the address, which the row no longer holds", () => {
    expect(waitlistRemoveSummary("ada@example.com")).toBe(
      "Removed ada@example.com from the waitlist",
    )
  })

  test("every summary stands on its own, without the Action column beside it", () => {
    const all = [
      roleChangeSummary("ada@example.com", "member", "admin"),
      roleChangeSummary("ada@example.com", null, "member"),
      roleChangeSummary("ada@example.com", "member", "member"),
      banSummary("ada@example.com"),
      unbanSummary("ada@example.com"),
      allowlistAddSummary("@example.com"),
      allowlistRemoveSummary("@example.com"),
      waitlistRemoveSummary("ada@example.com"),
    ]
    for (const summary of all) {
      // A verb and the thing it happened to: the test of "informational" is that the sentence answers what happened without a header.
      expect(summary).toMatch(/^[A-Z]\w+ \S/)
      expect(summary).toContain("example.com")
    }
  })
})
