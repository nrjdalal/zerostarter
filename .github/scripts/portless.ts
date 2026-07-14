// Derives each app's public URLs from portless's PORTLESS_URL (worktree branch included) and injects them before spawning the real dev command; a transparent pass-through when PORTLESS_URL is unset (PORTLESS=0, CI).

// The api host is the web host with a leftmost `api.` label (api-first, the `api.<env>` layout), so the api is a child of each env's web host. Strip or prepend that leftmost label to get the sibling. A branch literally named `api` would be misread as the api host; update this if the naming scheme changes.
export function deriveUrls(portlessUrl: string): { web: string; api: string } {
  const labels = new URL(portlessUrl).hostname.split(".")
  const isApi = labels[0] === "api"
  const webLabels = isApi ? labels.slice(1) : labels
  const apiLabels = isApi ? labels : ["api", ...labels]
  const toOrigin = (host: string[]) => {
    const url = new URL(portlessUrl)
    url.hostname = host.join(".")
    return url.origin
  }
  return { web: toOrigin(webLabels), api: toOrigin(apiLabels) }
}

if (import.meta.main) {
  const cmd = process.argv.slice(2)
  if (cmd.length === 0) {
    console.error("portless: no command given")
    process.exit(1)
  }

  const overrides: Record<string, string> = {}
  const portlessUrl = process.env.PORTLESS_URL
  if (portlessUrl) {
    const { web, api } = deriveUrls(portlessUrl)
    overrides.NEXT_PUBLIC_APP_URL = web
    overrides.NEXT_PUBLIC_API_URL = api
    overrides.HONO_APP_URL = api
    overrides.HONO_TRUSTED_ORIGINS = web
  }

  const proc = Bun.spawn(cmd, {
    env: { ...process.env, ...overrides },
    stdio: ["inherit", "inherit", "inherit"],
  })
  const stop = () => proc.kill()
  process.on("SIGINT", stop)
  process.on("SIGTERM", stop)
  process.exit((await proc.exited) ?? 1)
}
