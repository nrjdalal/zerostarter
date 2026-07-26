import { describe, expect, test } from "bun:test"

import {
  CONSOLE_ROLES,
  consoleRole,
  matchesAllowlist,
  parseAllowlistRule,
  refuseBan,
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

describe("refuseBan", () => {
  const ban = (over: Partial<Parameters<typeof refuseBan>[0]> = {}) =>
    refuseBan({ actorRole: "admin", isSelf: false, targetRole: "user", ...over })

  test("an admin bans below its own rank", () => {
    expect(ban()).toBeNull()
    expect(ban({ targetRole: "member" })).toBeNull()
  })

  test("nobody bans themselves", () => {
    expect(ban({ isSelf: true })).toBe("self")
    expect(ban({ actorRole: "owner", isSelf: true })).toBe("self")
  })

  test("an admin cannot ban a peer or above", () => {
    expect(ban({ targetRole: "admin" })).toBe("outranked")
    expect(ban({ targetRole: "owner" })).toBe("outranked")
  })

  test("an owner bans any other account, including a peer owner", () => {
    for (const role of CONSOLE_ROLES) {
      expect(ban({ actorRole: "owner", targetRole: role })).toBeNull()
    }
  })

  test("nobody below admin bans anyone", () => {
    expect(ban({ actorRole: "member" })).toBe("outranked")
    expect(ban({ actorRole: "user" })).toBe("outranked")
    expect(ban({ actorRole: "constructor" })).toBe("outranked")
  })

  test("an unrecognized target role is treated as the lowest rung, not as an escape", () => {
    expect(ban({ targetRole: "superuser" })).toBeNull()
    expect(ban({ actorRole: "member", targetRole: "superuser" })).toBe("outranked")
  })
})

describe("parseAllowlistRule", () => {
  test("a leading @ is a domain rule", () => {
    expect(parseAllowlistRule("@example.com")).toEqual({ kind: "domain", value: "@example.com" })
    expect(parseAllowlistRule("@mail.example.co.uk")).toEqual({
      kind: "domain",
      value: "@mail.example.co.uk",
    })
  })

  test("anything else must look like an address", () => {
    expect(parseAllowlistRule("ada@example.com")).toEqual({
      kind: "email",
      value: "ada@example.com",
    })
    expect(parseAllowlistRule("ada+beta@example.com")).toEqual({
      kind: "email",
      value: "ada+beta@example.com",
    })
  })

  test("case and surrounding whitespace are normalized away", () => {
    expect(parseAllowlistRule("  Ada@Example.COM ")).toEqual({
      kind: "email",
      value: "ada@example.com",
    })
    expect(parseAllowlistRule("@EXAMPLE.com")).toEqual({ kind: "domain", value: "@example.com" })
  })

  test("rejects what is neither", () => {
    for (const input of [
      "",
      "   ",
      "example.com",
      "@",
      "@nodot",
      "ada@",
      "@exa mple.com",
      "a@b@c.com",
      "ada example@x.com",
    ]) {
      expect(parseAllowlistRule(input)).toBeNull()
    }
  })
})

describe("matchesAllowlist", () => {
  const domain = parseAllowlistRule("@example.com")!
  const address = parseAllowlistRule("ada@other.com")!

  test("an empty list grants nothing, so a rule is always a deliberate grant", () => {
    expect(matchesAllowlist("anyone@anywhere.com", [])).toBe(false)
  })

  test("a domain rule covers every address at that domain", () => {
    expect(matchesAllowlist("ada@example.com", [domain])).toBe(true)
    expect(matchesAllowlist("grace+test@example.com", [domain])).toBe(true)
  })

  test("a domain rule does not cover a subdomain, which needs its own rule", () => {
    expect(matchesAllowlist("ada@mail.example.com", [domain])).toBe(false)
  })

  test("an address rule covers only that address", () => {
    expect(matchesAllowlist("ada@other.com", [address])).toBe(true)
    expect(matchesAllowlist("grace@other.com", [address])).toBe(false)
    expect(matchesAllowlist("ada+test@other.com", [address])).toBe(false)
  })

  test("matching ignores case on both sides", () => {
    expect(matchesAllowlist("ADA@Example.COM", [domain])).toBe(true)
    expect(matchesAllowlist("Ada@Other.com", [address])).toBe(true)
  })

  test("a non-matching address matches nothing", () => {
    expect(matchesAllowlist("ada@nope.com", [domain, address])).toBe(false)
  })

  test("a malformed address never matches", () => {
    expect(matchesAllowlist("not-an-email", [domain])).toBe(false)
  })
})
