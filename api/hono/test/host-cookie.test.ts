import { describe, expect, test } from "bun:test"

import { fromBetterAuthResponse, toBetterAuthRequest, withHostCookies } from "@/lib/host-cookie"

const cookies = (res: Response) => res.headers.getSetCookie()

describe("fromBetterAuthResponse: __Secure- -> __Host- on https", () => {
  test("renames a Secure cookie to __Host- and strips Domain (blocks sibling cookie-tossing)", () => {
    const res = new Response(null, {
      headers: {
        "set-cookie":
          "__Secure-better-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.zerostarter.dev",
      },
    })
    const [out] = cookies(fromBetterAuthResponse(res))
    expect(out).toStartWith("__Host-better-auth.session_token=abc")
    expect(out.toLowerCase()).not.toContain("domain=")
    expect(out).toContain("Secure")
    expect(out).toMatch(/Path=\//i)
  })

  test("leaves a non-Secure cookie (local http) untouched, never forging __Host- without Secure", () => {
    const res = new Response(null, {
      headers: { "set-cookie": "better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax" },
    })
    const [out] = cookies(fromBetterAuthResponse(res))
    expect(out).toStartWith("better-auth.session_token=abc")
    expect(out).not.toContain("__Host-")
  })

  test("renames a Secure deletion cookie (Max-Age=0) so logout clears the __Host- cookie the browser holds", () => {
    const res = new Response(null, {
      headers: {
        "set-cookie":
          "__Secure-better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.zerostarter.dev",
      },
    })
    const [out] = cookies(fromBetterAuthResponse(res))
    expect(out).toStartWith("__Host-better-auth.session_token=")
    expect(out).toMatch(/Max-Age=0/i)
    expect(out.toLowerCase()).not.toContain("domain=")
    expect(out).toMatch(/;\s*Path=\/$/i)
  })

  test("forces Path=/ (a __Host- requirement): adds it when missing, normalizes a narrower path", () => {
    const missing = fromBetterAuthResponse(
      new Response(null, { headers: { "set-cookie": "__Secure-x=1; Secure" } }),
    )
    expect(cookies(missing)[0]).toMatch(/;\s*Path=\/$/i)
    const narrower = fromBetterAuthResponse(
      new Response(null, { headers: { "set-cookie": "__Secure-x=1; Secure; Path=/app" } }),
    )
    expect(cookies(narrower)[0]).not.toContain("/app")
    expect(cookies(narrower)[0]).toMatch(/;\s*Path=\/$/i)
  })

  test("passes a response with no Set-Cookie through unchanged", () => {
    const res = new Response("ok")
    expect(fromBetterAuthResponse(res)).toBe(res)
  })
})

describe("toBetterAuthRequest: __Host- -> __Secure- on read", () => {
  test("renames __Host- names back so Better Auth (which reads __Secure-) finds the session", () => {
    const req = new Request("https://zerostarter.dev/api/auth/get-session", {
      headers: { cookie: "__Host-better-auth.session_token=abc; other=1" },
    })
    expect(toBetterAuthRequest(req).headers.get("cookie")).toBe(
      "__Secure-better-auth.session_token=abc; other=1",
    )
  })

  test("a request with neither prefix is a no-op", () => {
    const req = new Request("https://zerostarter.dev/x", { headers: { cookie: "plain=1" } })
    expect(toBetterAuthRequest(req)).toBe(req)
  })

  test("drops a bare __Secure- cookie (a Domain cookie leaked from a sibling env), so it can't authenticate here", () => {
    const req = new Request("https://canary.zerostarter.dev/api/auth/get-session", {
      headers: { cookie: "__Secure-better-auth.session_token=prod; other=1" },
    })
    expect(toBetterAuthRequest(req).headers.get("cookie")).toBe("other=1")
  })

  test("with both our __Host- and a leaked __Secure-, only our __Host- session survives", () => {
    const req = new Request("https://canary.zerostarter.dev/api/auth/get-session", {
      headers: {
        cookie: "__Host-better-auth.session_token=mine; __Secure-better-auth.session_token=leaked",
      },
    })
    expect(toBetterAuthRequest(req).headers.get("cookie")).toBe(
      "__Secure-better-auth.session_token=mine",
    )
  })
})

describe("withHostCookies: fetch-boundary round trip (covers /api/v1 reads, not just /api/auth)", () => {
  test("renames the incoming __Host- cookie for the handler and re-emits Set-Cookie as __Host-", async () => {
    const seen: (string | null)[] = []
    const fetch = ((req: Request) => {
      seen.push(req.headers.get("cookie"))
      return new Response(null, {
        headers: {
          "set-cookie": "__Secure-better-auth.session_token=new; Path=/; Secure; HttpOnly",
        },
      })
    }) as Parameters<typeof withHostCookies>[0]
    const res = await withHostCookies(fetch)(
      new Request("https://zerostarter.dev/api/v1/user", {
        headers: { cookie: "__Host-better-auth.session_token=old" },
      }),
    )
    expect(seen[0]).toBe("__Secure-better-auth.session_token=old")
    expect(cookies(res as Response)[0]).toStartWith("__Host-better-auth.session_token=new")
  })

  test("a websocket upgrade bypasses the rewrite untouched (does not break the upgrade)", async () => {
    const seen: (string | null)[] = []
    const fetch = ((req: Request) => {
      seen.push(req.headers.get("cookie"))
      return new Response(null, { status: 101 })
    }) as Parameters<typeof withHostCookies>[0]
    await withHostCookies(fetch)(
      new Request("https://api.zerostarter.dev/api/health/ws", {
        headers: { upgrade: "websocket", cookie: "__Host-better-auth.session_token=x" },
      }),
    )
    expect(seen[0]).toBe("__Host-better-auth.session_token=x")
  })
})
