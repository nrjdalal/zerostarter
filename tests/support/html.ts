// Shared HTML helpers for the fetch-based web specs, so the title regex and the escape rule live in one place.

// The document <title> text exactly as served (HTML entities not decoded).
export function titleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
}

// Escapes ampersands the way React serializes them into HTML, so an expected string matches the served markup.
export function htmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;")
}
