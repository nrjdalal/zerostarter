import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { expect, request, type APIRequestContext, type APIResponse } from "@playwright/test"

import { API_URL, TRUSTED_ORIGIN } from "@/urls"

export const AUTH_DIR = fileURLToPath(new URL("../.auth", import.meta.url))
export const STORAGE_STATE = path.join(AUTH_DIR, "agent.json")
const COOKIE_FILE = path.join(AUTH_DIR, "agent-cookie.txt")

// Signs in as the local agent and returns the session Cookie header value.
export async function signInAsAgent(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${API_URL}/api/agents/sign-in-as`, {
    headers: { origin: TRUSTED_ORIGIN },
    maxRedirects: 0,
  })
  expect(res.status()).toBe(302)
  const setCookie = res.headers()["set-cookie"]
  expect(setCookie).toBeTruthy()
  const cookie = setCookie.split(";")[0]
  expect(cookie).toContain("session_token")
  return cookie
}

// The shared agent cookie written by the setup project; API/web specs reuse it instead of minting a session per test.
export function agentCookie(): string {
  return fs.readFileSync(COOKIE_FILE, "utf8").trim()
}

export function saveAgentCookie(cookie: string) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(COOKIE_FILE, cookie)
}

// A request context for the API origin; pass the agent cookie for authenticated calls.
export async function apiContext(cookie?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: cookie ? { cookie } : undefined,
  })
}

// Asserts the exact { error: { code, message } } envelope every API error uses.
export async function expectErrorEnvelope(
  res: APIResponse,
  status: number,
  code: string,
  message?: string,
) {
  expect(res.status()).toBe(status)
  const body = await res.json()
  expect(Object.keys(body)).toEqual(["error"])
  expect(body.error.code).toBe(code)
  if (message !== undefined) expect(body.error.message).toBe(message)
  return body
}

export function uniqueEmail(prefix = "golden"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}
