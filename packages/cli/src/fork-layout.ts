export interface ForkLayout {
  excludes: string[]
  preserve: string[]
}

const PRESERVE_MARKER = "# PRESERVE_ON_SYNC"

// Parse the starter's .gitpickignore into the fork boundary in one pass: excludes are the paths a scaffolded or synced fork drops from the starter (init removes them in place; gitpick never fetches them); preserve are the PRESERVE_ON_SYNC directive paths sync restores after the overlay. Excludes are returned verbatim; the in-place converter validates each is a literal path before removing it.
export const parseForkLayout = (gitpickignore: string): ForkLayout => {
  const excludes: string[] = []
  let preserve: string[] = []
  let preserveSet = false
  for (const line of gitpickignore.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (!preserveSet && trimmed.startsWith(PRESERVE_MARKER)) {
      preserve = trimmed
        .slice(PRESERVE_MARKER.length)
        .replace(/^\s*-\s*/, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      preserveSet = true
      continue
    }
    if (trimmed.startsWith("#")) continue
    excludes.push(trimmed)
  }
  return { excludes, preserve }
}
