import { describe, expect, test } from "bun:test"

import {
  fromBetterAuthResponse,
  handleAuthWithHostCookies,
  toBetterAuthRequest,
} from "@/lib/host-cookie"

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

  test("adds Path=/ when missing (a __Host- requirement)", () => {
    const res = new Response(null, { headers: { "set-cookie": "__Secure-x=1; Secure" } })
    expect(cookies(fromBetterAuthResponse(res))[0]).toMatch(/Path=\//i)
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

  test("a request without a __Host- cookie is a no-op", () => {
    const req = new Request("https://zerostarter.dev/x", { headers: { cookie: "plain=1" } })
    expect(toBetterAuthRequest(req)).toBe(req)
  })
})

describe("handleAuthWithHostCookies: round trip", () => {
  test("a browser __Host- cookie is read by the handler and re-emitted as __Host-", async () => {
    const seen: (string | null)[] = []
    const handler = async (req: Request): Promise<Response> => {
      seen.push(req.headers.get("cookie"))
      return new Response(null, {
        headers: {
          "set-cookie": "__Secure-better-auth.session_token=new; Path=/; Secure; HttpOnly",
        },
      })
    }
    const raw = new Request("https://zerostarter.dev/api/auth/get-session", {
      headers: { cookie: "__Host-better-auth.session_token=old" },
    })
    const res = await handleAuthWithHostCookies(handler, raw)
    expect(seen[0]).toBe("__Secure-better-auth.session_token=old")
    expect(cookies(res)[0]).toStartWith("__Host-better-auth.session_token=new")
  })
})
