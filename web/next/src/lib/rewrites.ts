// Markdown content negotiation (acceptmarkdown.com) as routing rules, the pattern Next documents and Vercel ships on its own blog: the CDN evaluates these before any cache or function, so the HTML pages stay static hits, where a proxy would put a function invocation in front of every request to them. Kept free of env imports so next.config.ts can import it and the tests can exercise the exact regexes. The trade: a header regex cannot rank q-values, but every agent that asks for markdown (acceptmarkdown.com/status) lists text/markdown first at q=1, so "names text/markdown, and not with q=0" is the RFC answer for all of them.

// Full-match regexes: Next wraps a has.value in ^...$ and Vercel's routing layer does the same.
export const ACCEPTS_MARKDOWN = "(.*)text/markdown(?!\\s*;\\s*q=0(?:\\.0+)?\\s*(?:,|$))(.*)"
// Accept is present but names none of the two representations nor a wildcard that would admit one.
export const ACCEPTS_NEITHER = "(?!.*(?:text/html|text/markdown|text/\\*|\\*/\\*)).+"

export const NOT_ACCEPTABLE_PATH = "/406"

type Rule = {
  destination: string
  has: { key: string; type: "header"; value: string }[]
  missing?: { key: string; type: "header" }[]
  source: string
}

// Pages with a markdown sibling and the llms.txt route that holds it: the index for the homepage, the same handlers the .md aliases reach for docs and blog.
const MARKDOWN_SIBLINGS = [
  { destination: "/llms.txt", source: "/" },
  { destination: "/llms.txt/blog/:path*", source: "/blog/:path*" },
  { destination: "/llms.txt/docs/:path*", source: "/docs/:path*" },
] as const

// Next's own RSC fetches carry Accept: */* and an rsc header; the header exclusion is belt and braces.
const notRsc = [{ key: "rsc", type: "header" as const }]

export function markdownRewrites(): Rule[] {
  return MARKDOWN_SIBLINGS.flatMap(({ destination, source }) => [
    {
      destination,
      has: [{ key: "accept", type: "header", value: ACCEPTS_MARKDOWN }],
      missing: notRsc,
      source,
    },
    {
      destination: NOT_ACCEPTABLE_PATH,
      has: [{ key: "accept", type: "header", value: ACCEPTS_NEITHER }],
      missing: notRsc,
      source,
    },
  ])
}

// The same test Next applies to a has.value, for callers that want to know what a header would do.
export const matchesHas = (value: string, header: string): boolean =>
  new RegExp(`^${value}$`).test(header)
