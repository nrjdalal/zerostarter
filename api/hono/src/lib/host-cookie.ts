import type { Hono } from "hono"

// Better Auth hardcodes the __Secure- cookie prefix and has no __Host- option, so we swap it at the server edge: __Host- is browser-enforced host-only (no Domain, Secure, Path=/), so a compromised sibling env cannot plant a __Host- cookie with a Domain that another env would read. Only cookies already marked Secure (production/https) are upgraded; local http keeps Better Auth's plain host-only cookie, since __Host- requires a secure page and only one environment runs per machine locally.
const SECURE = "__Secure-"
const HOST = "__Host-"

// A Set-Cookie carrying Better Auth's __Secure- name with the Secure attribute is the only kind we upgrade to __Host-.
const isSecureBetterAuthCookie = (sc: string): boolean =>
  sc.startsWith(SECURE) && /;\s*secure/i.test(sc)

// On the way in, trust only host-only __Host- cookies: rename them to __Secure- (the name Better Auth reads), and DROP any bare __Secure- cookie. A bare __Secure- arriving here was set with a Domain by a sibling env (an un-migrated prod) and sent to us cross-subdomain; we never set one, so it must not authenticate here.
export function toBetterAuthRequest(raw: Request): Request {
  const cookie = raw.headers.get("cookie")
  if (!cookie || (!cookie.includes(HOST) && !cookie.includes(SECURE))) return raw
  const kept: string[] = []
  for (const part of cookie.split(/;\s*/)) {
    if (part.startsWith(HOST)) kept.push(SECURE + part.slice(HOST.length))
    else if (!part.startsWith(SECURE)) kept.push(part)
  }
  const headers = new Headers(raw.headers)
  if (kept.length) headers.set("cookie", kept.join("; "))
  else headers.delete("cookie")
  return new Request(raw, { headers })
}

// Rename Secure __Secure- cookies to __Host- on the way out, dropping any Domain and forcing Path=/ (both are __Host- requirements; a narrower Path makes the browser silently drop the cookie).
export function fromBetterAuthResponse(res: Response): Response {
  const setCookies = res.headers.getSetCookie()
  if (!setCookies.some(isSecureBetterAuthCookie)) return res
  const headers = new Headers(res.headers)
  headers.delete("set-cookie")
  for (const sc of setCookies) {
    if (isSecureBetterAuthCookie(sc)) {
      const out = `${HOST}${sc.slice(SECURE.length)}`
        .replace(/;\s*domain=[^;]*/i, "")
        .replace(/;\s*path=[^;]*/i, "")
      headers.append("set-cookie", `${out}; Path=/`)
    } else {
      headers.append("set-cookie", sc)
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

// Wrap the whole app's fetch so every session read and write carries the rename uniformly, applied once at the server boundary rather than per route: each handler and middleware sees __Secure-, every outgoing Set-Cookie leaves as __Host-. WebSocket upgrades never carry the host-only cookie and reconstructing their request would break the upgrade, so they bypass the rewrite untouched.
export function withHostCookies(fetch: Hono["fetch"]): Hono["fetch"] {
  return (req, ...rest) => {
    const upgrade = req.headers.get("upgrade")
    if (upgrade && upgrade.toLowerCase() === "websocket") return fetch(req, ...rest)
    return Promise.resolve(fetch(toBetterAuthRequest(req), ...rest)).then(fromBetterAuthResponse)
  }
}
