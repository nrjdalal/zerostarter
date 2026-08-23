import { describe, expect, test } from "bun:test"

import {
  consoleSecurity,
  securitySchemes,
  sessionSecurity,
} from "../../../../../api/hono/src/lib/openapi"
import { ACCESS_ROLE, CONSOLE_ROLES } from "../../../../../packages/auth/src/access"

describe("securitySchemes", () => {
  test("declares the session cookie as an apiKey scheme under the real cookie name", () => {
    const schemes = securitySchemes("__Secure-better-auth.session_token")
    expect(schemes.sessionCookie.type).toBe("apiKey")
    expect(schemes.sessionCookie.in).toBe("cookie")
    expect(schemes.sessionCookie.name).toBe("__Secure-better-auth.session_token")
  })

  test("spells out the role ladder so an agent can read what each requirement means", () => {
    const { description } = securitySchemes("better-auth.session_token").sessionCookie
    expect(description).toContain(CONSOLE_ROLES.join(" > "))
  })
})

describe("security requirements", () => {
  test("a signed-in route needs the cookie and no particular role", () => {
    expect(sessionSecurity).toEqual([{ sessionCookie: [] }])
  })

  test("a console route names the minimum role in the requirement, as OpenAPI 3.1 allows for non-OAuth schemes", () => {
    expect(consoleSecurity).toEqual([{ sessionCookie: [ACCESS_ROLE] }])
    expect(CONSOLE_ROLES).toContain(ACCESS_ROLE)
  })
})
