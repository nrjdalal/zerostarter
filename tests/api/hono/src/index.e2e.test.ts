import { describe, expect, test } from "bun:test"

import { API, Client, enabled, normalize } from "../../../stack"

// The app's own surface in api/hono/src/index.ts, driven over HTTP on a running stack: health, the OpenAPI document, and the error envelope for a route that does not exist. Golden: the document and the envelopes are snapshotted after normalize(), so a contract change fails here until the snapshot is updated on purpose (bun test --update-snapshots). Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("api/hono/src/index.ts", () => {
  const anonymous = new Client(API)

  test("health names the build and answers ok", async () => {
    const { status, body } = await anonymous.json("/api/health")
    expect(status).toBe(200)
    expect(normalize(body)).toMatchSnapshot()
  })

  test("the OpenAPI document is the contract", async () => {
    const { status, body } = await anonymous.json<{ openapi: string; paths: object }>(
      "/api/openapi.json",
    )
    expect(status).toBe(200)
    expect(Object.keys(body.paths).length).toBeGreaterThan(5)
    expect(normalize(body)).toMatchSnapshot()
  })

  test("an unknown route answers the error envelope", async () => {
    const { status, body } = await anonymous.json("/api/nothing-here")
    expect(status).toBe(404)
    expect(body).toMatchSnapshot()
  })
})
