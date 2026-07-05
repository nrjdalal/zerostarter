import handler, { createServerEntry } from "@tanstack/react-start/server-entry"

// Port of the Next.js app's next.config rewrites for the built server: /docs|blog/<path>.md|.txt serve the llms.txt markdown routes at the original URL (no redirect). Vite dev cannot route unregistered extension-ful paths here, so vite.config.ts installs the same rewrite as dev middleware.
export const MD_ALIAS = /^\/(docs|blog)(?:\/(.+))?\.(?:md|txt)$/

export default createServerEntry({
  fetch(request) {
    const url = new URL(request.url)
    const match = url.pathname.match(MD_ALIAS)
    if (match) {
      url.pathname = `/llms.txt/${match[1]}${match[2] ? `/${match[2]}` : ""}`
      return handler.fetch(new Request(url, request))
    }
    return handler.fetch(request)
  },
})
