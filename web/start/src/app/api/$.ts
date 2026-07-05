import { createFileRoute } from "@tanstack/react-router"

import { config } from "@/lib/config"

// Port of web/next's /api/:path* rewrite: the whole Hono API is reachable same-origin (the frontend relies on this for credentialed calls). App-owned API routes (/api/search, /api/console/search) are more specific and win over this splat.
async function proxy(request: Request, splat: string | undefined): Promise<Response> {
  const incoming = new URL(request.url)
  const base = config.api.internalUrl || config.api.url
  const target = new URL(`/api/${splat ?? ""}${incoming.search}`, base)

  const headers = new Headers(request.headers)
  headers.delete("host")

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
    // @ts-expect-error duplex is required by undici for streamed request bodies and absent from the standard RequestInit type.
    duplex: "half",
  })

  return response
}

const handler = ({ request, params }: { request: Request; params: { _splat?: string } }) =>
  proxy(request, params._splat)

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
      OPTIONS: handler,
    },
  },
})
