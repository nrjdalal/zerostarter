import { notAcceptable } from "@/lib/markdown"

// The 406 half of markdown negotiation: a rewrite in next.config.ts lands here when a request's Accept names neither text/html nor text/markdown (see src/lib/rewrites.ts). Dynamic because the body echoes the header.
export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return notAcceptable(request.headers.get("accept") ?? "")
}
