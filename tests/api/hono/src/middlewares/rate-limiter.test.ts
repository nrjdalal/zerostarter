import { describe, expect, test } from "bun:test"

import {
  clientAddress,
  rateLimitDecision,
} from "../../../../../api/hono/src/middlewares/rate-limiter"

// A test in this slice cannot import hono itself, only modules that do, so the context is the two fields the resolver reads: the raw request and the Bun server Hono takes the peer from (the env argument of fetch).
type Ctx = Parameters<typeof clientAddress>[0]

const bunServer = (address: string) => ({
  requestIP: () => ({ address, family: "IPv4", port: 40000 }),
})

const context = (headers: Record<string, string>, peer?: string): Ctx =>
  ({
    env: peer ? bunServer(peer) : undefined,
    req: { raw: new Request("http://api.test/", { headers }) },
  }) as unknown as Ctx

describe("clientAddress", () => {
  test("a public peer is the client, whatever a header claims", () => {
    expect(clientAddress(context({ "x-forwarded-for": "1.1.1.1" }, "8.8.8.8"))).toEqual({
      address: "8.8.8.8",
      internal: false,
    })
  })

  test("a private peer is a proxy, so the client is the address it forwarded", () => {
    expect(clientAddress(context({ "x-forwarded-for": "1.1.1.1" }, "172.18.0.5"))).toEqual({
      address: "1.1.1.1",
      internal: false,
    })
  })

  test("a private peer that forwarded nothing is internal traffic", () => {
    expect(clientAddress(context({}, "172.18.0.5"))).toEqual({
      address: "172.18.0.5",
      internal: true,
    })
    // portless in local dev: a loopback proxy forwarding a loopback client.
    expect(clientAddress(context({ "x-forwarded-for": "127.0.0.1" }, "127.0.0.1"))).toEqual({
      address: "127.0.0.1",
      internal: true,
    })
  })

  test("unwraps the IPv4-mapped form a dual-stack listener reports, so a public IPv4 client is still billed", () => {
    // Bun listening on :: reports an IPv4 peer as ::ffff:a.b.c.d, which @arcjet/ip classifies as nothing at all.
    expect(clientAddress(context({ "x-forwarded-for": "1.1.1.1" }, "::ffff:8.8.8.8"))).toEqual({
      address: "8.8.8.8",
      internal: false,
    })
    expect(clientAddress(context({}, "::ffff:172.18.0.5"))).toEqual({
      address: "172.18.0.5",
      internal: true,
    })
    expect(clientAddress(context({}, "::1"))).toEqual({ address: "::1", internal: true })
    expect(clientAddress(context({ "x-forwarded-for": "1.1.1.1" }, "2606:4700::1111"))).toEqual({
      address: "2606:4700::1111",
      internal: false,
    })
  })

  test("consults x-forwarded-for alone, so no other client header can name a bucket", () => {
    // The IP library would otherwise fall through to these.
    for (const header of ["forwarded", "true-client-ip", "x-client-ip", "x-real-ip"]) {
      const value = header === "forwarded" ? "for=8.8.8.8" : "8.8.8.8"
      expect(clientAddress(context({ [header]: value }, "172.18.0.5"))).toEqual({
        address: "172.18.0.5",
        internal: true,
      })
      expect(clientAddress(context({ [header]: value }))).toEqual({
        address: "unknown",
        internal: false,
      })
    }
  })

  test("with no socket at all, an unattributable request lands in one shared bucket, never a fresh key", () => {
    expect(clientAddress(context({}))).toEqual({ address: "unknown", internal: false })
    expect(clientAddress(context({ "x-forwarded-for": "1.1.1.1" }))).toEqual({
      address: "1.1.1.1",
      internal: false,
    })
  })
})

describe("rateLimitDecision", () => {
  test("a forged forwarding header does not buy a public peer a fresh bucket", () => {
    const first = rateLimitDecision(context({ "x-forwarded-for": "1.1.1.1" }, "8.8.8.8"))
    const second = rateLimitDecision(context({ "x-forwarded-for": "9.9.9.9" }, "8.8.8.8"))
    expect(first).toEqual({ key: "ip:8.8.8.8", skip: false })
    expect(second).toEqual(first)
  })

  test("keeps forwarded clients apart behind a proxy", () => {
    expect(rateLimitDecision(context({ "x-forwarded-for": "1.1.1.1" }, "172.18.0.5")).key).toBe(
      "ip:1.1.1.1",
    )
    expect(rateLimitDecision(context({ "x-forwarded-for": "9.9.9.9" }, "172.18.0.5")).key).toBe(
      "ip:9.9.9.9",
    )
  })

  test("requests with no address at all share one budget rather than escaping it", () => {
    expect(rateLimitDecision(context({}))).toEqual({ key: "ip:unknown", skip: false })
    expect(rateLimitDecision(context({}))).toEqual(rateLimitDecision(context({})))
  })

  test("internal traffic is skipped", () => {
    expect(rateLimitDecision(context({}, "172.18.0.5")).skip).toBe(true)
  })

  test("a request the limiter can name by user is billed by that user, even from an internal peer", () => {
    expect(rateLimitDecision(context({}, "172.18.0.5"), () => "u1")).toEqual({
      key: "userid:u1",
      skip: false,
    })
  })

  test("an API key bills its hash, never the key itself", () => {
    const decision = rateLimitDecision(context({}, "172.18.0.5"), undefined, () => "secret-key")
    expect(decision.skip).toBe(false)
    expect(decision.key).toMatch(/^apikey:[0-9a-f]+$/)
    expect(decision.key).not.toContain("secret-key")
  })
})
