// Runs a dev command with this app's public URLs derived from PORTLESS_URL (the URL portless assigned it, with
// the worktree branch prefix baked in). This keeps the branch slug in ONE place (portless) and keeps
// @packages/env portless-agnostic. Without PORTLESS_URL (PORTLESS=0, CI, or a non-portless run) it is a
// transparent pass-through using whatever the static .env provides.
export {}

const cmd = process.argv.slice(2)
if (cmd.length === 0) {
  console.error("portless-env: no command given")
  process.exit(1)
}

// Host grammar (same locally and in the cloud): [<branch>.]{api.}<project>.<tld>. The base is the last two
// labels; the "api" service label, when present, sits immediately before the base (the leftmost label is the
// branch slug in a worktree, not the service). Derive the sibling by toggling that adjacent "api" label.
function deriveUrls(portlessUrl: string): { web: string; api: string } {
  const url = new URL(portlessUrl)
  const labels = url.hostname.split(".")
  const apiIdx = labels.length - 3
  const isApi = apiIdx >= 0 && labels[apiIdx] === "api"
  const webLabels = isApi ? [...labels.slice(0, apiIdx), ...labels.slice(apiIdx + 1)] : labels
  const apiLabels = isApi
    ? labels
    : [...labels.slice(0, labels.length - 2), "api", ...labels.slice(labels.length - 2)]
  const port = url.port ? `:${url.port}` : ""
  const toUrl = (l: string[]) => `${url.protocol}//${l.join(".")}${port}`
  return { web: toUrl(webLabels), api: toUrl(apiLabels) }
}

const overrides: Record<string, string> = {}
const portlessUrl = process.env.PORTLESS_URL
if (portlessUrl) {
  const { web, api } = deriveUrls(portlessUrl)
  overrides.NEXT_PUBLIC_APP_URL = web
  overrides.NEXT_PUBLIC_API_URL = api
  overrides.HONO_APP_URL = api
  overrides.HONO_TRUSTED_ORIGINS = web
  // Server-side (SSR and the Next /api rewrite) reach the API on loopback, never the .localhost name: curl and
  // Node do not resolve *.localhost without an /etc/hosts entry, which we skip. appPort pins the API to HONO_PORT.
  overrides.INTERNAL_API_URL = `http://localhost:${process.env.HONO_PORT ?? "4000"}`
}

const proc = Bun.spawn(cmd, {
  env: { ...process.env, ...overrides },
  stdio: ["inherit", "inherit", "inherit"],
})
const stop = () => proc.kill()
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
process.exit(await proc.exited)
