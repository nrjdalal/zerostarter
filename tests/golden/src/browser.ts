import { expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { agentCookie, eventually } from "@/http"
import { WEB_URL } from "@/urls"

export const AUTH_DIR = fileURLToPath(new URL("../.auth", import.meta.url))
export const AGENT_STATE = path.join(AUTH_DIR, "agent-state.json")

const BIN =
  Bun.which("agent-browser") ??
  fileURLToPath(new URL("../../../node_modules/.bin/agent-browser", import.meta.url))

// The platform decides which modifier opens the search dialog (the app dispatches Meta on mac, Control elsewhere).
export const SEARCH_HOTKEY = process.platform === "darwin" ? "Meta+k" : "Control+k"

export interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
}

// A thin driver around the agent-browser CLI. Each instance is an isolated browser session (own cookies, tabs, refs).
export class Browser {
  constructor(
    readonly session: string,
    private state?: string,
  ) {}

  run(args: string[], { allowFail = false } = {}): RunResult {
    const proc = Bun.spawnSync([BIN, "--session", this.session, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const result = {
      ok: proc.exitCode === 0,
      stdout: proc.stdout.toString().trim(),
      stderr: proc.stderr.toString().trim(),
    }
    if (!allowFail && !result.ok) {
      throw new Error(`agent-browser ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`)
    }
    return result
  }

  open(urlOrPath: string) {
    const url = urlOrPath.startsWith("http") ? urlOrPath : `${WEB_URL}${urlOrPath}`
    if (this.state) {
      this.run(["--state", this.state, "open", url])
      this.state = undefined
    } else {
      this.run(["open", url])
    }
    this.run(["wait", "--load", "networkidle"])
  }

  close() {
    this.run(["close"], { allowFail: true })
  }

  // Clears all cookies (including httpOnly session cookies) so a test can start logged out.
  clearCookies() {
    this.run(["cookies", "clear"], { allowFail: true })
  }

  clickRole(role: string, name: string) {
    this.run(["find", "role", role, "click", "--name", name])
  }

  clickText(text: string) {
    this.run(["find", "text", text, "click"])
  }

  // Clicks the element whose snapshot line contains `needle`. Use for nodes role+name can't reach: portalled search results, composed accessible names, or ambiguous links disambiguated by their accessible-name text. Defaults to the full snapshot (interactive drops portalled results).
  clickSnapshotMatch(needle: string, opts: { interactive?: boolean; urls?: boolean } = {}) {
    const ref = this.refFor(needle, { interactive: false, ...opts })
    if (!ref) throw new Error(`no ref found for snapshot line containing ${JSON.stringify(needle)}`)
    this.run(["click", `@${ref}`])
  }

  // Clicks a link by its accessible name, matched in the interactive snapshot (nav/sidebar/content links appear there with refs).
  clickLink(name: string) {
    this.clickSnapshotMatch(`link "${name}"`, { interactive: true, urls: true })
  }

  fillPlaceholder(placeholder: string, value: string) {
    this.run(["find", "placeholder", placeholder, "fill", value])
  }

  press(key: string) {
    this.run(["press", key])
  }

  waitText(text: string) {
    this.run(["wait", "--text", text])
  }

  waitPath(pathname: string) {
    this.run(["wait", "--fn", `location.pathname === ${JSON.stringify(pathname)}`])
  }

  url(): string {
    return this.run(["get", "url"]).stdout
  }

  title(): string {
    return this.run(["get", "title"]).stdout
  }

  snapshot({ interactive = true, urls = false } = {}): string {
    const args = interactive ? ["snapshot", "-i", "-c"] : ["snapshot", "-c"]
    if (urls) args.push("-u")
    return this.run(args).stdout
  }

  // The @ref on the first snapshot line matching `needle`, or null. The ref may be any bracket attribute (e.g. "[expanded=false, ref=e4]"), so match it anywhere in the line.
  refFor(needle: string, opts?: { interactive?: boolean; urls?: boolean }): string | null {
    const line = this.snapshot(opts)
      .split("\n")
      .find((l) => l.includes(needle) && /\bref=e\d+/.test(l))
    return line?.match(/\bref=(e\d+)/)?.[1] ?? null
  }

  eval(js: string): string {
    return this.run(["eval", js]).stdout
  }

  evalBool(js: string): boolean {
    return this.eval(js) === "true"
  }

  dialogOpen(): boolean {
    return this.evalBool("!!document.querySelector('[role=dialog]')")
  }

  waitDialogOpen() {
    this.run(["wait", "--fn", "!!document.querySelector('[role=dialog]')"])
  }

  waitDialogClosed() {
    this.run(["wait", "--fn", "!document.querySelector('[role=dialog]')"])
  }

  isVisible(selector: string): boolean {
    return this.run(["is", "visible", selector], { allowFail: true }).stdout === "true"
  }

  hasText(text: string): boolean {
    const result = this.run(["wait", "--text", text], { allowFail: true })
    return result.ok
  }

  // Instant, exact check for a clickable control by its trimmed text. Use for negative assertions (hasText would burn the full wait timeout when the text is absent).
  hasControl(text: string): boolean {
    const js = `[...document.querySelectorAll('button,a')].some(el => el.textContent.trim() === ${JSON.stringify(text)})`
    return this.evalBool(js)
  }

  htmlClass(): string {
    return JSON.parse(this.eval("document.documentElement.className")) as string
  }
}

let stateSaved = false

// Logs the local agent into a throwaway browser session once and saves cookies + localStorage; admin e2e sessions start from this state.
export async function ensureAgentState(): Promise<string> {
  if (stateSaved) return AGENT_STATE
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await agentCookie()
  const setup = new Browser("golden-state-setup")
  try {
    setup.open("/")
    setup.clickRole("button", "Login")
    setup.waitText("Login (agents)")
    setup.clickRole("button", "Login (agents)")
    await eventually(() => {
      expect(new URL(setup.url()).pathname).toBe("/dashboard")
    }, 30_000)
    setup.run(["state", "save", AGENT_STATE])
    stateSaved = true
  } finally {
    setup.close()
  }
  return AGENT_STATE
}
