import { describe, expect, test } from "bun:test"

import { OPENAPI_PATHS, SITE } from "@/surface"
import { API_URL } from "@/urls"

async function openapiDoc() {
  const res = await fetch(`${API_URL}/api/openapi.json`)
  expect(res.status).toBe(200)
  return res.json()
}

describe("OpenAPI document and Scalar reference", () => {
  test("GET /api/openapi.json documents exactly the described routes", async () => {
    const doc = await openapiDoc()
    expect(doc.openapi).toBe("3.1.0")
    expect(doc.info.title).toBe(SITE.name)
    expect(doc.info.version).toMatch(/^\d+\.\d+\.\d+/)

    expect(Object.keys(doc.paths).sort()).toEqual(Object.keys(OPENAPI_PATHS).sort())
    for (const [path, methods] of Object.entries(OPENAPI_PATHS)) {
      expect(Object.keys(doc.paths[path]).sort()).toEqual(methods)
    }
  })

  test("every documented operation declares the always-reachable 429 and 500", async () => {
    const doc = await openapiDoc()
    for (const [path, methods] of Object.entries(OPENAPI_PATHS)) {
      for (const method of methods) {
        const responses = doc.paths[path][method].responses
        expect(responses["429"], `${method.toUpperCase()} ${path} missing 429`).toBeTruthy()
        expect(responses["500"], `${method.toUpperCase()} ${path} missing 500`).toBeTruthy()
      }
    }
  })

  test("auth-gated operations declare 401 and validated operations declare 400", async () => {
    const doc = await openapiDoc()
    expect(doc.paths["/api/v1/session"].get.responses["401"]).toBeTruthy()
    expect(doc.paths["/api/v1/user"].get.responses["401"]).toBeTruthy()
    expect(doc.paths["/api/waitlist"].post.responses["400"]).toBeTruthy()
  })

  test("GET /api/docs serves the Scalar reference UI", async () => {
    const res = await fetch(`${API_URL}/api/docs`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    const html = await res.text()
    expect(html).toContain(`API Reference | ${SITE.name}`)
    expect(html).toContain("/api/openapi.json")
  })
})
