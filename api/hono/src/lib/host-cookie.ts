// Better Auth hardcodes the __Secure- cookie prefix and has no __Host- option, so we swap it at the edge.
// __Host- is browser-enforced host-only (no Domain, Secure, Path=/): a compromised sibling env (staging,
// canary) cannot plant a __Host- cookie with a Domain that another env would read. We only upgrade cookies
// that are already Secure (production/https); local http keeps Better Auth's plain host-only cookie, since
// __Host- requires a secure page to be set and only one environment runs per machine locally.

const SECURE = "__Secure-"
const HOST = "__Host-"

// On the way in, rename __Host- cookie names back to __Secure- so Better Auth (which reads __Secure-) finds them.
export function toBetterAuthRequest(raw: Request): Request {
  const cookie = raw.headers.get("cookie")
  if (!cookie || !cookie.includes(HOST)) return raw
  const headers = new Headers(raw.headers)
  headers.set("cookie", cookie.replace(new RegExp(`(^|;\\s*)${HOST}`, "g"), `$1${SECURE}`))
  return new Request(raw, { headers })
}

// On the way out, rename Secure __Secure- cookies to __Host- and drop any Domain so the browser enforces host-only.
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

// Wrap Better Auth's handler so both the incoming cookie and the outgoing Set-Cookie carry the __Host- name.
export async function handleAuthWithHostCookies(
  handler: (req: Request) => Promise<Response>,
  raw: Request,
): Promise<Response> {
  return fromBetterAuthResponse(await handler(toBetterAuthRequest(raw)))
}
