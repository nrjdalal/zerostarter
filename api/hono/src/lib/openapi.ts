import { ACCESS_ROLE, CONSOLE_ROLES } from "@packages/auth/access"

// OpenAPI 3.1: for a security scheme that is not oauth2 or openIdConnect, the requirement's array "MAY contain a list of role names which are required for the execution", so the console gate's minimum role is declared where a client can read it, not only in prose. The cookie name is passed in: Better Auth derives it (prefix, environment label, __Secure- on https), and index.ts hands over the real one.
export const securitySchemes = (sessionCookieName: string) =>
  ({
    sessionCookie: {
      description: `Better Auth session cookie, set by sign-in. Console operations list the minimum role they require; the ladder is ${CONSOLE_ROLES.join(" > ")}.`,
      in: "cookie",
      name: sessionCookieName,
      type: "apiKey",
    },
  }) as const

// Add to routes behind authMiddleware: a signed-in user of any role.
export const sessionSecurity = [{ sessionCookie: [] }]

// Add to routes behind the console gate: a signed-in user at or above the console's minimum role.
export const consoleSecurity = [{ sessionCookie: [ACCESS_ROLE] }]
