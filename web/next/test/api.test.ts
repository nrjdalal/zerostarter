/**
 * API surface through the web app: the /api proxy semantics (og exclusions,
 * passthrough fidelity), the search contract, the waitlist contract, and the
 * agents sign-in origin gating (hit directly on the API, it is origin-scoped).
 *
 * Mutating waitlist cases are opt-in: ALLOW_DB_WRITES=true (they insert rows;
 * clean up per the app-smoke skill).
 */
import { afterAll, describe, expect, test } from "bun:test"

import { cleanupSmokeRows } from "./db"
import { API, BASE, get, req } from "./helpers"

// the two waitlist tests below insert rows when ALLOW_DB_WRITES=true; remove
// them so test:e2e is self-cleaning. Gated so default (read-only) runs never
// touch the DB.
afterAll(async () => {
  if (process.env.ALLOW_DB_WRITES === "true") await cleanupSmokeRows()
})

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
    const [plain, withQuery] = await Promise.all([get("/api/waitlist"), get("/api/waitlist?x=1")])
    expect(plain.status).toBe(200)
    expect(withQuery.status).toBe(200)
  })

  test("/api/og and /api/og/* are NOT proxied (local routes win, junk 404s)", async () => {
    const res = await get("/api/og/junk")
    expect(res.status).toBe(404)
    // next renders its own 404 (html), not the API's json envelope
    expect(res.headers.get("content-type") ?? "").not.toContain("application/json")
  })

  test("/api/ogx IS proxied (lookahead excludes only og and og/)", async () => {
    const res = await get("/api/ogx")
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("NOT_FOUND")
  })

  test("anonymous get-session proxies as empty/null", async () => {
    const res = await get("/api/auth/get-session")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("null")
  })
})

describe("search contract", () => {
  test("query returns structured page+heading results", async () => {
    const res = await get("/api/search?query=colors")
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
    expect(page?.url).toBe("/docs/design-system/foundations/colors")
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

describe("waitlist contract", () => {
  test("GET returns a display-ready count", async () => {
    const res = await get("/api/waitlist")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { count: number } }
    expect(typeof body.data.count).toBe("number")
    expect(body.data.count).toBeGreaterThanOrEqual(0)
  })

  test("POST invalid email -> validation error envelope", async () => {
    const res = await req("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", subject: "" }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    const body = (await res.json()) as { error: { code?: string; message?: string } }
    expect(body.error).toBeDefined()
  })

  test.skipIf(process.env.ALLOW_DB_WRITES !== "true")(
    "POST valid email -> ok (inserts a row; cleanup per app-smoke skill)",
    async () => {
      const res = await req("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `smoke-spec-${Date.now()}@example.test`, subject: "" }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { message: string } }
      expect(body.data.message).toBe("ok")
    },
  )

  test.skipIf(process.env.ALLOW_DB_WRITES !== "true")(
    "POST with filled honeypot -> silently ok (no insert)",
    async () => {
      const res = await req("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `smoke-honeypot-${Date.now()}@example.test`,
          subject: "i am a bot",
        }),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { message: string } }
      expect(body.data.message).toBe("ok")
    },
  )
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
})

// --- coverage gap-fill: search shape + method, content-types ---

describe("api gap-fill", () => {
  test("/api/search returns application/json and rejects non-GET verbs", async () => {
    const ok = await get("/api/search?query=colors")
    expect(ok.headers.get("content-type")).toStartWith("application/json")
    expect((await req("/api/search", { method: "PUT" })).status).toBe(405)
  })

  test("/api/search returns both page and text result types with string urls", async () => {
    const results = (await (await get("/api/search?query=colors")).json()) as {
      type: string
      url: string
    }[]
    const types = new Set(results.map((r) => r.type))
    expect(types.has("page")).toBe(true)
    expect(types.has("text")).toBe(true)
    expect(results.every((r) => typeof r.url === "string" && r.url.length > 0)).toBe(true)
  })
})
