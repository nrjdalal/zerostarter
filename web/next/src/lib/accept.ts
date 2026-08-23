// Accept negotiation per RFC 9110 section 12.5.1, as acceptmarkdown.com's readiness check scores it: rank by q-value, break ties by specificity then client order, treat q=0 as an explicit rejection, and report "nothing acceptable" (a 406) rather than guessing. A missing or empty header means no constraint, so the server default wins.

type AcceptEntry = { q: number; specificity: number; type: string }

export function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const [rawType = "", ...params] = raw.split(";").map((part) => part.trim())
      const type = rawType.toLowerCase()
      let q = 1
      for (const param of params) {
        const [name, value] = param.split("=").map((part) => part.trim())
        if (name?.toLowerCase() !== "q") continue
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed))
      }
      const specificity = type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2
      return { q, specificity, type }
    })
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === "*/*") return true
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1))
  return entry.type === candidate
}

// The media type to serve from `produces` (server preference order), or null when the client accepts none of them.
export function preferredType<T extends string>(
  header: string | null | undefined,
  produces: readonly T[],
): T | null {
  const fallback = produces[0] ?? null
  if (!header) return fallback
  const entries = parseAccept(header)
  if (entries.length === 0) return fallback

  let best: T | null = null
  let bestQ = -1
  let bestPosition = Infinity
  for (const candidate of produces) {
    // The most specific matching range decides, whatever its q: `text/html;q=0, */*` rejects html rather than letting the wildcard re-admit it.
    let matched: AcceptEntry | null = null
    let matchedPosition = Infinity
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
      if (!entry || !matches(entry, candidate)) continue
      if (
        matched === null ||
        entry.specificity > matched.specificity ||
        (entry.specificity === matched.specificity && index < matchedPosition)
      ) {
        matched = entry
        matchedPosition = index
      }
    }
    if (matched === null) continue
    const { q } = matched
    if (q <= 0) continue
    if (q > bestQ || (q === bestQ && matchedPosition < bestPosition)) {
      best = candidate
      bestQ = q
      bestPosition = matchedPosition
    }
  }
  return best
}

// Vary: Accept on every negotiated response, appended rather than replaced so a framework's own Vary tokens survive.
export function withVaryAccept(headers: Headers): Headers {
  const existing = headers.get("Vary")
  if (!existing) {
    headers.set("Vary", "Accept")
    return headers
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase())
  if (!tokens.includes("accept") && !tokens.includes("*"))
    headers.set("Vary", `${existing}, Accept`)
  return headers
}
