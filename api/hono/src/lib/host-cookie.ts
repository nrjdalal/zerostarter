import type { Hono } from "hono"

// Better Auth hardcodes the __Secure- cookie prefix and has no __Host- option, so we swap it at the server edge: __Host- is browser-enforced host-only (no Domain, Secure, Path=/), so a compromised sibling env cannot plant a __Host- cookie with a Domain that another env would read. Only cookies already marked Secure (production/https) are upgraded; local http keeps Better Auth's plain host-only cookie, since __Host- requires a secure page and only one environment runs per machine locally.
const SECURE = "__Secure-"
const HOST = "__Host-"

// Rename __Host- cookie names back to __Secure- on the way in so Better Auth (which only reads __Secure-) finds the session.
export function toBetterAuthRequest(raw: Request): Request {
  const cookie = raw.headers.get("cookie")
  if (!cookie || !cookie.includes(HOST)) return raw
  const headers = new Headers(raw.headers)
  headers.set("cookie", cookie.replace(new RegExp(`(^|;\\s*)${HOST}`, "g"), `$1${SECURE}`))
  return new Request(raw, { headers })
}

// Rename Secure __Secure- cookies to __Host- and drop any Domain on the way out so the browser enforces host-only.
export function fromBetterAuthResponse(res: Response): Response {
  const setCookies = res.headers.getSetCookie()
  if (!setCookies.some((c) => c.startsWith(SECURE) && /;\s*secure/i.test(c))) return res
  const headers = new Headers(res.headers)
  headers.delete("set-cookie")
  for (const sc of setCookies) {
    if (sc.startsWith(SECURE) && /;\s*secure/i.test(sc)) {
      let out = `${HOST}${sc.slice(SECURE.length)}`.replace(/;\s*domain=[^;]*/i, "")
      if (!/;\s*path=/i.test(out)) out += "; Path=/"
      headers.append("set-cookie", out)
    } else {
      headers.append("set-cookie", sc)
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

// Wrap the whole app's fetch so every session read and write carries the rename uniformly, applied once at the server boundary rather than per route: each handler and middleware sees __Secure-, every outgoing Set-Cookie leaves as __Host-. WebSocket upgrades never carry the host-only cookie and reconstructing their request would break the upgrade, so they bypass the rewrite untouched.
export function withHostCookies(fetch: Hono["fetch"]): Hono["fetch"] {
  return (req, ...rest) => {
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") return fetch(req, ...rest)
    return Promise.resolve(fetch(toBetterAuthRequest(req), ...rest)).then(fromBetterAuthResponse)
  }
}
