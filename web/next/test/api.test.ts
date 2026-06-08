/**
 * API surface through the web app: the /api proxy semantics (og exclusions,
 * passthrough fidelity), the search contract, the auth/system endpoints, and
 * the agents sign-in origin gating (hit directly on the API, it is
 * origin-scoped).
 */
import { describe, expect, test } from "bun:test"

import { API, APP_NAME, BASE, get, req, signInAsAgent } from "./helpers"

describe("api proxy semantics", () => {
  test("/api/health proxies to the API (ok envelope)", async () => {
    const res = await get("/api/health")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { message: string } }
    expect(body.data.message).toBe("ok")
  })

  test("/api/docs proxies the scalar html page", async () => {
    const res = await get("/api/docs")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toStartWith("text/html")
  })

  test("a proxied route stays reachable with a query string appended", async () => {
    // no proxied GET route varies by query, so this is a reachability smoke,
    // not a semantic passthrough assertion; the proxy appends search verbatim
    const [plain, withQuery] = await Promise.all([get("/api/health"), get("/api/health?x=1")])
    expect(plain.status).toBe(200)
    expect(withQuery.status).toBe(200)
  })

  test("/api/og and /api/og/* are NOT proxied (local routes win, junk 404s)", async () => {
    // rewrite source is /api/:path((?!og$|og/).*) — the lookahead excludes the
    // exact segment `og` and anything under `og/`, so these hit next locally
    const res = await get("/api/og/junk")
    expect(res.status).toBe(404)
    // next renders its own 404 (html), not the API's json envelope
    expect(res.headers.get("content-type") ?? "").not.toContain("application/json")
  })

  test("/api/ogx IS proxied (lookahead excludes only og and og/)", async () => {
    // `ogx` is neither `og$` nor `og/`, so the rewrite matches and proxies it
    const res = await get("/api/ogx")
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("NOT_FOUND")
  })

  test("/api/v1/* IS proxied (unauthed -> API's UNAUTHORIZED envelope)", async () => {
    const res = await get("/api/v1/user")
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  test("anonymous get-session proxies as empty/null", async () => {
    const res = await get("/api/auth/get-session")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("null")
  })
})

describe("search contract", () => {
  test("query returns structured page+heading results", async () => {
    const res = await get("/api/search?query=theming")
    expect(res.status).toBe(200)
    const results = (await res.json()) as {
      id: string
      type: string
      url: string
      content: string
    }[]
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    const page = results.find((r) => r.type === "page")
    expect(page?.url).toBe("/docs/manage/theming")
    for (const r of results) {
      expect(typeof r.id).toBe("string")
      expect(typeof r.url).toBe("string")
      expect(typeof r.content).toBe("string")
    }
  })

  test("unknown term returns empty array", async () => {
    const res = await get("/api/search?query=zzzznotaword")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test("missing query param is handled", async () => {
    const res = await get("/api/search")
    expect([200, 400]).toContain(res.status)
  })

  test("POST is not allowed", async () => {
    const res = await req("/api/search", { method: "POST" })
    expect(res.status).toBe(405)
  })
})

describe("auth + system endpoints", () => {
  test("/api/health -> 200 ok envelope (version + environment)", async () => {
    const res = await get("/api/health")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toStartWith("application/json")
    const body = (await res.json()) as {
      data: { message: string; version: string; environment: string }
    }
    expect(body.data.message).toBe("ok")
    expect(typeof body.data.version).toBe("string")
    expect(typeof body.data.environment).toBe("string")
  })

  test("/api/openapi.json -> 200 json document for this app", async () => {
    const res = await get("/api/openapi.json")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") ?? "").toContain("application/json")
    const doc = (await res.json()) as { info: { title: string } }
    expect(doc.info.title).toBe(APP_NAME)
  })

  test("/api/v1/user WITHOUT a session -> 401 UNAUTHORIZED", async () => {
    const res = await get("/api/v1/user")
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  test("/api/v1/user WITH the agent session -> 200 + the agent user", async () => {
    const cookie = await signInAsAgent()
    expect(cookie).toContain("better-auth.session_token")
    const res = await get("/api/v1/user", { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { id: string; email: string; name: string; emailVerified: boolean }
    }
    expect(typeof body.data.id).toBe("string")
    expect(body.data.email).toBe("agent@zerostarter.dev")
    expect(body.data.name).toBe("AgentZero")
    expect(body.data.emailVerified).toBe(true)
  })
})

describe("agents sign-in origin gating (local-only endpoint)", () => {
  test("trusted origin -> 302 to <origin>/dashboard with session cookie", async () => {
    const res = await fetch(`${API}/api/agents/sign-in-as`, {
      method: "POST",
      headers: { origin: BASE },
      redirect: "manual",
    })
    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe(`${BASE}/dashboard`)
    expect(res.headers.get("set-cookie") ?? "").toContain("better-auth.session_token")
    expect(res.headers.get("access-control-allow-origin")).toBe(BASE)
    expect(res.headers.get("access-control-allow-credentials")).toBe("true")
  })

  test("untrusted origin -> AGENTS_LOGIN_FAILED", async () => {
    const res = await fetch(`${API}/api/agents/sign-in-as`, {
      method: "POST",
      headers: { origin: "http://evil.example" },
      redirect: "manual",
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe("AGENTS_LOGIN_FAILED")
    expect(body.error.message).toBe("untrusted Origin")
  })

  test("missing origin -> AGENTS_LOGIN_FAILED", async () => {
    const res = await fetch(`${API}/api/agents/sign-in-as`, {
      method: "POST",
      redirect: "manual",
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.message).toBe("missing Origin header")
  })

  test("non-POST verb is rejected", async () => {
    const res = await fetch(`${API}/api/agents/sign-in-as`, {
      method: "GET",
      headers: { origin: BASE },
      redirect: "manual",
    })
    expect(res.status).toBe(404)
  })
})

// --- coverage gap-fill: search shape + method, content-types ---

describe("api gap-fill", () => {
  test("/api/search returns application/json and rejects non-GET verbs", async () => {
    const ok = await get("/api/search?query=theming")
    expect(ok.headers.get("content-type")).toStartWith("application/json")
    expect((await req("/api/search", { method: "PUT" })).status).toBe(405)
  })

  test("/api/search returns both page and text result types with string urls", async () => {
    const results = (await (await get("/api/search?query=theming")).json()) as {
      type: string
      url: string
    }[]
    const types = new Set(results.map((r) => r.type))
    expect(types.has("page")).toBe(true)
    expect(types.has("text")).toBe(true)
    expect(results.every((r) => typeof r.url === "string" && r.url.length > 0)).toBe(true)
  })
})
