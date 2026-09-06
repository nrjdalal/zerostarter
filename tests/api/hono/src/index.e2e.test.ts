import { describe, expect, test } from "bun:test"

import { API, Client, enabled, normalize } from "../../../stack"

// The app's own surface in api/hono/src/index.ts, driven over HTTP on a running stack: the root, the header echo, health over HTTP and over the WebSocket, the OpenAPI document and its reference UI, and the error envelope for a route that does not exist. The stage is asserted as local, the only one the suite can sign in on and the one the Docker build used to lose. Golden: the document, the frames and the envelopes are snapshotted after normalize(), so a contract change fails here until the snapshot is updated on purpose (bun run test:e2e --update-snapshots).

type Health = { data: { environment: string; message: string; version: string } }

describe.skipIf(!enabled)("api/hono/src/index.ts", () => {
  const anonymous = new Client(API)

  test("the root names the build and the stage", async () => {
    const { status, body } = await anonymous.json<{ data: { environment: string } }>("/")
    expect(status).toBe(200)
    expect(body.data.environment).toBe("local")
    expect(normalize(body)).toMatchSnapshot()
  })

  test("the header echo answers on a local stage", async () => {
    const { status, body } = await anonymous.json<{ data: Record<string, string> }>("/headers", {
      headers: { "x-golden": "echo" },
    })
    expect(status).toBe(200)
    expect(body.data["x-golden"]).toBe("echo")
  })

  test("health names the build and answers ok", async () => {
    const { status, body } = await anonymous.json<Health>("/api/health")
    expect(status).toBe(200)
    expect(body.data.environment).toBe("local")
    expect(normalize(body)).toMatchSnapshot()
  })

  test("health over the WebSocket opens with a snapshot frame", async () => {
    const frame = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(`${API.replace(/^http/, "ws")}/api/health/ws`)
      const timer = setTimeout(() => reject(new Error("no frame within 5s")), 5000)
      socket.onmessage = (event) => {
        clearTimeout(timer)
        socket.close()
        resolve(String(event.data))
      }
      socket.onerror = () => reject(new Error("websocket failed"))
    })
    const parsed = JSON.parse(frame) as { environment: string; message: string; timestamp: string }
    expect(parsed.message).toBe("ok")
    expect(parsed.environment).toBe("local")
    expect(normalize(parsed)).toMatchSnapshot()
  })

  test("the OpenAPI document is the contract", async () => {
    const { status, body } = await anonymous.json<{ openapi: string; paths: object }>(
      "/api/openapi.json",
    )
    expect(status).toBe(200)
    expect(Object.keys(body.paths).length).toBeGreaterThan(5)
    expect(normalize(body)).toMatchSnapshot()
  })

  test("the API reference renders", async () => {
    const response = await anonymous.fetch("/api/docs")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })

  test("an unknown route answers the error envelope", async () => {
    const { status, body } = await anonymous.json("/api/nothing-here")
    expect(status).toBe(404)
    expect(body).toMatchSnapshot()
  })
})
