// Derives each app's public URLs from portless's PORTLESS_URL (worktree branch included) and injects them before spawning the real dev command; a transparent pass-through when PORTLESS_URL is unset (PORTLESS=0, CI).

// Toggle the adjacent `api.` label (it sits just before the two base labels) to get the sibling app's host. Assumes the two-app `<name>` / `api.<name>` naming from the package.json `portless.name`s (convert.ts keeps forks in sync) and a single-label worktree prefix; a branch literally named `api` would be misread as the api host. Update this if that scheme changes.
export function deriveUrls(portlessUrl: string): { web: string; api: string } {
  const labels = new URL(portlessUrl).hostname.split(".")
  const apiIdx = labels.length - 3
  const isApi = apiIdx >= 0 && labels[apiIdx] === "api"
  const webLabels = isApi ? labels.toSpliced(apiIdx, 1) : labels
  const apiLabels = isApi ? labels : labels.toSpliced(labels.length - 2, 0, "api")
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
