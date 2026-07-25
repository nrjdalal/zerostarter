import { describe, expect, test } from "bun:test"

import { CONSOLE_ROLES, consoleRole, roleAtLeast } from "../../../../packages/auth/src/access"

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
