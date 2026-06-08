/**
 * Browser tier: client-only interactions driven through the agent-browser CLI,
 * gated behind BROWSER_TESTS. Run via `bun run test:e2e`; the `web-spec` skill
 * covers the tier's gotchas (clicks, clipboard, popovers, polling).
 *
 * Waits are condition-polls (waitFor), not fixed sleeps — faster and stable
 * enough to wire into CI.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { BASE, MODE } from "./helpers"

const enabled = process.env.BROWSER_TESTS === "true"

function ab(...args: string[]): string {
  const proc = Bun.spawnSync(["bunx", "agent-browser", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  if (proc.exitCode !== 0) {
    throw new Error(
      `agent-browser ${args[0]} failed (exit ${proc.exitCode}): ${proc.stderr.toString().trim()}`,
    )
  }
  return proc.stdout.toString().trim()
}

const evaluate = (expr: string) => ab("eval", expr)
const json = (expr: string) => JSON.parse(JSON.parse(evaluate(`JSON.stringify(${expr})`)))
// eval returns JSON-quoted strings ("/path"); unwrap to the bare value
const evalStr = (expr: string): string => JSON.parse(evaluate(expr))

// poll a boolean JS expression until it's true — replaces fixed sleeps so the
// tier is fast (returns the moment the condition holds) and CI-stable (no
// hard-coded guesses). Throws with a label on timeout.
async function waitFor(boolExpr: string, label: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (evaluate(boolExpr) === "true") return
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeoutMs}ms: ${label}`)
    await Bun.sleep(100)
  }
}
const waitForPath = (path: string) =>
  waitFor(`location.pathname === ${JSON.stringify(path)}`, `navigate to ${path}`)

// base-ui triggers ignore synthetic .click(); drive a real CDP pointer click
// by resolving the element's snapshot ref by its accessible name. Match an
// interactive role before the name so a same-named heading (e.g. the sr-only
// DialogTitle "Sign in/up") never shadows its button.
function clickByName(name: string): boolean {
  const snap = ab("snapshot", "-i")
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(?:button|link|menuitem|tab|option)\\s+"${esc}"[^\\n]*ref=(e\\d+)`)
  const ref = snap.match(re)?.[1]
  if (!ref) return false
  ab("click", `@${ref}`)
  return true
}

async function open(path: string) {
  ab("open", `${BASE}${path}`)
  ab("wait", "--load", "networkidle")
}

beforeAll(() => {
  if (!enabled) return
  // fail loudly and early if the CLI is missing rather than as cryptic
  // assertion errors deep in a test
  const probe = Bun.spawnSync(["bunx", "agent-browser", "--version"], {
    stdout: "pipe",
    stderr: "pipe",
  })
  if (probe.exitCode !== 0) {
    throw new Error(
      "agent-browser CLI not available; install it or unset BROWSER_TESTS to skip this tier",
    )
  }
  // earlier HTTP-tier tests leave an agent session in the shared daemon; a
  // logged-in navbar hides the Login dialog the interaction tests need
  ab("open", BASE)
  ab("cookies", "clear")
}, 30_000)

describe.skipIf(!enabled)("browser behaviors", () => {
  test("smart theme toggle cycles and persists", async () => {
    await open("/docs")
    evaluate("localStorage.removeItem('theme'); location.reload()")
    const toggle = `button[aria-label="Switch between system/light/dark version"]`
    await waitFor(`!!document.querySelector('${toggle}')`, "theme toggle ready")

    const states: string[] = []
    for (let i = 0; i < 2; i++) {
      // capture before clicking so this is robust to next-themes pre-seeding
      const before = evalStr(`localStorage.getItem('theme') ?? 'null'`)
      clickByName("Switch between system/light/dark version")
      await waitFor(
        `(localStorage.getItem('theme') ?? 'null') !== ${JSON.stringify(before)}`,
        "theme changed",
      )
      states.push(evalStr(`localStorage.getItem('theme') ?? 'unset'`))
    }
    expect(states[0]).not.toBe("unset")
    expect(states[1]).not.toBe(states[0])

    evaluate("location.reload()")
    await waitFor(`!!document.querySelector('${toggle}')`, "toggle ready after reload")
    expect(evalStr(`localStorage.getItem('theme')`)).toBe(states[1])
  }, 60_000)

  test("home: api status widget resolves client-side", async () => {
    await open("/")
    // ApiStatus flips from its invisible loading state to operational once
    // /api/health resolves; the visible status carries role="status"
    await waitFor(
      `[...document.querySelectorAll('[role="status"][aria-label="API status"]')].some(el => getComputedStyle(el).visibility !== 'hidden' && el.innerText.includes('All systems are operational'))`,
      "api status operational",
    )
  }, 60_000)

  test("login dialog opens, shows providers, validates email", async () => {
    await open("/docs")
    expect(clickByName("Login")).toBe(true)
    await waitFor(`document.body.innerText.includes('Welcome to ZeroStarter')`, "login dialog open")
    const d = json(`({
      github: document.body.innerText.includes('Continue with Github'),
      google: document.body.innerText.includes('Continue with Google'),
      agents: document.body.innerText.includes('Login (agents)'),
      terms: document.body.innerText.includes('Terms of Service'),
    })`)
    expect(d.github).toBe(true)
    expect(d.google).toBe(true)
    expect(d.terms).toBe(true)
    expect(d.agents).toBe(MODE === "dev")

    // real CDP fill drives React's onChange directly; do NOT pre-seed the
    // value via eval first — that desyncs the controlled input and the
    // validator then runs against stale state
    ab("fill", "input[type=email]", "not-an-email")
    await waitFor(
      `document.querySelector('input[type=email]')?.value === 'not-an-email'`,
      "email field filled",
    )
    clickByName("Sign in/up")
    await waitFor(
      `document.body.innerText.includes('Please enter a valid email address.')`,
      "email validation message",
    )
    ab("press", "Escape")
  }, 60_000)

  test("search dialog: cmd+k opens, type + arrow + enter navigates", async () => {
    await open("/docs")
    ab("press", "Meta+k")
    await waitFor(
      `!!document.querySelector('input[placeholder="Search..."],input[placeholder="Search"]')`,
      "search dialog open",
    )
    ab("fill", 'input[placeholder="Search..."],input[placeholder="Search"]', "Architecture")
    // wait for the debounced results to render the Architecture result link
    await waitFor(
      `[...document.querySelectorAll('a')].some(a => a.getAttribute('href') === '/docs/getting-started/architecture')`,
      "search results",
    )
    ab("press", "ArrowDown")
    ab("press", "Enter")
    await waitForPath("/docs/getting-started/architecture")
  }, 60_000)

  test("copy-as-markdown affordance is present and clickable", async () => {
    await open("/docs/getting-started/architecture")
    // clipboard writeText is blocked in headless (the copied state is never
    // reached), so this only asserts the affordance is present and the click
    // is accepted — appearance/behavior beyond that isn't observable here
    const sel = `button[aria-label="Copy as markdown"]`
    expect(evaluate(`!!document.querySelector('${sel}')`)).toBe("true")
    expect(clickByName("Copy as markdown")).toBe(true)
  }, 60_000)

  test("docs sidebar: collapsible category expands and navigates", async () => {
    await open("/docs")
    clickByName("Content Management")
    await waitFor(
      `[...document.querySelectorAll('[data-sidebar] a')].some(a => a.textContent.trim()==='Blog')`,
      "Content Management expanded",
    )
    evaluate(
      `[...document.querySelectorAll('[data-sidebar] a')].find(a => a.textContent.trim()==='Blog')?.click()`,
    )
    await waitForPath("/docs/manage/blog")
  }, 60_000)

  test.skipIf(MODE !== "dev")(
    "dashboard: agents login navigates + sidebar collapse persists",
    async () => {
      // dropdown-driven org-switch and logout are dismissable base-ui popovers
      // that close between separate CLI processes, so they are not asserted
      // here; the dashboard SSR (identity, version, collapse cookie, session)
      // is covered deterministically in dashboard.test.ts
      await open("/docs")
      clickByName("Login")
      await waitFor(`document.body.innerText.includes('Login (agents)')`, "login dialog open")
      clickByName("Login (agents)")
      await waitForPath("/dashboard")

      clickByName("Toggle Sidebar")
      await waitFor(`document.cookie.includes('sidebar_state=false')`, "sidebar_state cookie set")
      evaluate("location.reload()")
      await waitFor(
        `!!document.querySelector('[data-state="collapsed"]')`,
        "collapsed after reload",
      )

      ab("cookies", "clear") // reset session for the rest of the suite
    },
    120_000,
  )

  test("mobile: sheet menu exposes nav links", async () => {
    ab("set", "viewport", "390", "844")
    try {
      await open("/docs")
      clickByName("Open menu")
      await waitFor(
        `[...document.querySelectorAll('a')].filter(a => /Documentation|Blog/.test(a.textContent)).length >= 2`,
        "mobile sheet open",
      )
      const links = json(
        `[...document.querySelectorAll('a')].filter(a => /Documentation|Blog/.test(a.textContent)).length`,
      )
      expect(links).toBeGreaterThanOrEqual(2)
      // the sheet also carries the social links
      const socials = json(
        `[...document.querySelectorAll('a[aria-label]')].filter(a => ['GitHub','Discord','X'].includes(a.getAttribute('aria-label'))).length`,
      )
      expect(socials).toBeGreaterThanOrEqual(3)
      ab("press", "Escape")
    } finally {
      // always restore the desktop viewport so later tests aren't left mobile
      ab("set", "viewport", "1440", "900")
    }
  }, 60_000)

  test("no console errors across pages", async () => {
    for (const path of ["/", "/docs", "/blog", "/blog/web-development-2026"]) {
      ab("console", "--clear")
      await open(path)
      await Bun.sleep(500) // grace window for late client-side errors to surface
      const errors = ab("console", "--level", "error")
      const real = errors
        .split("\n")
        .filter((l) => l.startsWith("[error]"))
        .filter((l) => !l.includes("favicon") && !l.toLowerCase().includes("clipboard"))
      expect(real, `${path}: ${real.join(" | ")}`).toEqual([])
    }
  }, 120_000)

  test("home: navbar present, devtools widget in dev", async () => {
    await open("/")
    // the navbar renders on / regardless of mode; only the dev-only affordances
    // (devtools widget, agents login) are gated by the build environment
    const nav = evaluate(`!!document.querySelector('[aria-label="Main navigation"]')`)
    expect(nav).toBe("true")
    const widget = evaluate(`!!document.querySelector('[class*="z-100"]')`)
    expect(widget).toBe(MODE === "dev" ? "true" : "false")
  }, 60_000)
})
