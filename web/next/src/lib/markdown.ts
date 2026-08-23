// The markdown representation's response shape, kept free of env imports so it is unit-testable. Vary: Accept because the same URL serves HTML to browsers and this markdown to agents (see proxy.ts); a cache keyed on the URL alone would hand one variant to the other's clients.
export const llmTextHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
} as const

// A 404 an agent can recover from: real status, markdown body, and the places to look next. The HTML boundary (app/not-found.tsx) is for browsers; markdown requests reach this instead.
export function markdownNotFound(appUrl: string): Response {
  return new Response(
    `# Not found

No page exists at this path, or it moved.

## Where to look next

- [Documentation index](${appUrl}/llms.txt): every page, one line each
- [Full documentation](${appUrl}/llms-full.txt): everything in one file
- [Sitemap](${appUrl}/sitemap.xml)
`,
    { headers: llmTextHeaders, status: 404 },
  )
}

// RFC 9110 406: the client accepts none of the representations this URL has, so say which exist rather than guess.
export function notAcceptable(accept: string): Response {
  return new Response(
    `Not Acceptable\n\nThis URL is available as:\n- text/html\n- text/markdown\n\nYou requested: ${accept}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" }, status: 406 },
  )
}
