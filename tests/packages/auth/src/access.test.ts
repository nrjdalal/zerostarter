import { describe, expect, test } from "bun:test"

import {
  CONSOLE_ROLES,
  consoleRole,
  refuseRoleChange,
  roleAtLeast,
} from "../../../../packages/auth/src/access"

describe("consoleRole", () => {
  test("passes every rung of the ladder through unchanged", () => {
    for (const role of CONSOLE_ROLES) {
      expect(consoleRole(role)).toBe(role)
    }
  })

  test("reads anything unrecognized as the lowest rung", () => {
    expect(consoleRole(null)).toBe("user")
    expect(consoleRole(undefined)).toBe("user")
    expect(consoleRole("")).toBe("user")
    expect(consoleRole("superuser")).toBe("user")
  })

  test("does not resolve a crafted value through the prototype chain", () => {
    expect(consoleRole("constructor")).toBe("user")
    expect(consoleRole("toString")).toBe("user")
    expect(consoleRole("__proto__")).toBe("user")
  })
})

describe("roleAtLeast", () => {
  test("a role always satisfies its own rung", () => {
    for (const role of CONSOLE_ROLES) {
      expect(roleAtLeast(role, role)).toBe(true)
    }
  })

  test("owner outranks every rung", () => {
    for (const role of CONSOLE_ROLES) {
      expect(roleAtLeast("owner", role)).toBe(true)
    }
  })

  test("member reads the console but does not write", () => {
    expect(roleAtLeast("member", "member")).toBe(true)
    expect(roleAtLeast("member", "admin")).toBe(false)
    expect(roleAtLeast("member", "owner")).toBe(false)
  })

  test("admin writes but cannot reach owner", () => {
    expect(roleAtLeast("admin", "member")).toBe(true)
    expect(roleAtLeast("admin", "admin")).toBe(true)
    expect(roleAtLeast("admin", "owner")).toBe(false)
  })

  test("user reaches nothing above the bottom rung", () => {
    expect(roleAtLeast("user", "member")).toBe(false)
    expect(roleAtLeast("user", "admin")).toBe(false)
  })

  test("an unknown or missing role can never satisfy a console rung", () => {
    for (const role of [null, undefined, "constructor", "superuser"]) {
      expect(roleAtLeast(role, "member")).toBe(false)
    }
  })
})

describe("refuseRoleChange", () => {
  const change = (over: Partial<Parameters<typeof refuseRoleChange>[0]> = {}) =>
    refuseRoleChange({
      actorRole: "owner",
      isSelf: false,
      nextRole: "member",
      targetIsLastOwner: false,
      targetRole: "user",
      ...over,
    })

  test("an owner promotes and demotes freely", () => {
    expect(change()).toBeNull()
    expect(change({ nextRole: "owner" })).toBeNull()
    expect(change({ nextRole: "user", targetRole: "admin" })).toBeNull()
  })

  test("nobody changes their own role", () => {
    expect(change({ isSelf: true })).toBe("self")
    expect(change({ actorRole: "owner", isSelf: true, nextRole: "owner" })).toBe("self")
  })

  test("only an owner grants owner", () => {
    expect(change({ actorRole: "admin", nextRole: "owner" })).toBe("owner-only")
  })

  test("an admin cannot act on a peer or above", () => {
    expect(change({ actorRole: "admin", targetRole: "admin" })).toBe("outranked")
    expect(change({ actorRole: "admin", targetRole: "owner", nextRole: "user" })).toBe("outranked")
  })

  test("an admin cannot promote above its own rank", () => {
    expect(change({ actorRole: "admin", nextRole: "admin" })).toBe("outranked")
    expect(change({ actorRole: "admin", nextRole: "member" })).toBeNull()
  })

  test("a member changes nobody", () => {
    expect(change({ actorRole: "member", targetRole: "user" })).toBe("outranked")
  })

  test("the last owner cannot be demoted, but can be left alone", () => {
    expect(change({ nextRole: "admin", targetIsLastOwner: true, targetRole: "owner" })).toBe(
      "last-owner",
    )
    expect(change({ nextRole: "owner", targetIsLastOwner: true, targetRole: "owner" })).toBeNull()
  })

  test("an unrecognized next role is refused before anything else is considered", () => {
    expect(change({ nextRole: "superuser" })).toBe("unknown-role")
    expect(change({ nextRole: "constructor" })).toBe("unknown-role")
  })
})
