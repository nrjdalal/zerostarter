import { expect } from "bun:test"

import { API_URL, TRUSTED_ORIGIN } from "@/urls"

// Signs in as the local agent over HTTP and returns the session Cookie header value.
export async function signInAsAgent(): Promise<string> {
  const res = await fetch(`${API_URL}/api/agents/sign-in-as`, {
    method: "POST",
    headers: { origin: TRUSTED_ORIGIN },
    redirect: "manual",
  })
  expect(res.status).toBe(302)
  const setCookie = res.headers.getSetCookie().join("; ")
  expect(setCookie).toContain("session_token")
  return setCookie.split(";")[0]
}

let sharedCookie: string | null = null

// One agent session shared by every test in the run; bun test runs in a single process, so a module-level memo is enough.
export async function agentCookie(): Promise<string> {
  sharedCookie ??= await signInAsAgent()
  return sharedCookie
}

// Asserts the exact { error: { code, message } } envelope every API error uses.
export async function expectErrorEnvelope(
  res: Response,
  status: number,
  code: string,
  message?: string,
) {
  expect(res.status).toBe(status)
  const body = (await res.json()) as { error: { code: string; message: string } }
  expect(Object.keys(body)).toEqual(["error"])
  expect(body.error.code).toBe(code)
  if (message !== undefined) expect(body.error.message).toBe(message)
  return body
}

export function uniqueEmail(prefix = "probe"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

// Retries an assertion block until it passes or the timeout elapses (Playwright's toPass, in miniature).
export async function eventually(fn: () => Promise<void> | void, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      await fn()
      return
    } catch (err) {
      if (Date.now() >= deadline) throw err
      await Bun.sleep(500)
    }
  }
}

// Waits for both servers so specs never race a cold stack.
export async function waitForStack() {
  await eventually(async () => {
    const health = await fetch(`${API_URL}/api/health`)
    expect(health.ok).toBe(true)
  }, 120_000)
  await eventually(async () => {
    const home = await fetch(process.env.GOLDEN_WEB_URL || "http://localhost:3000")
    expect(home.ok).toBe(true)
  }, 120_000)
}
