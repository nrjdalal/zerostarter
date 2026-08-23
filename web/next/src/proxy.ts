import { NextResponse, type NextRequest } from "next/server"

import { withVaryAccept } from "@/lib/accept"
import { negotiateMarkdown } from "@/lib/negotiate"

// Markdown content negotiation (acceptmarkdown.com): the pages that have a markdown sibling serve it from their own URL when a client asks for text/markdown, and a client that accepts neither gets a 406. The markdown variant, the 406 and the markdown 404 carry Vary: Accept themselves; the HTML variant cannot, since both the Node server's page render and Vercel drop a Vary set here or in next.config headers(), and the rewrite runs before any cache, so no variant reaches the other's clients. The decision lives in lib/negotiate.ts; this only maps it onto Next responses.
export function proxy(request: NextRequest) {
  const decision = negotiateMarkdown({
    accept: request.headers.get("accept"),
    method: request.method,
    nextInternal:
      request.headers.has("rsc") ||
      request.headers.has("next-action") ||
      (request.headers.get("accept") ?? "").includes("text/x-component"),
    pathname: request.nextUrl.pathname,
  })

  switch (decision.kind) {
    case "markdown": {
      const url = request.nextUrl.clone()
      url.pathname = decision.path
      const response = NextResponse.rewrite(url)
      withVaryAccept(response.headers)
      return response
    }
    case "not-acceptable":
      return new NextResponse(
        `Not Acceptable\n\nThis URL is available as:\n- text/html\n- text/markdown\n\nYou requested: ${decision.requested}\n`,
        {
          headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" },
          status: 406,
        },
      )
    default:
      return NextResponse.next()
  }
}

export const config = {
  matcher: ["/", "/blog/:path*", "/docs/:path*"],
}
