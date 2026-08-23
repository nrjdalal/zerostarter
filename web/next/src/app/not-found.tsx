import { RouteNotFound } from "@/components/common/route-not-found"

// Without this Next serves its own bare document (<html id="__next_error__">), which renders outside the root layout: no theme class, no fonts, so a 404 flashes white before or instead of the app's own styling. This one renders inside the layout, so it is themed like the rest of the app. It catches notFound() from a page, not from a layout that has already begun streaming: that one still reaches Next's internal fallback, which is the flash tracked in .github/notes/plans/console-notfound-status.md.
// It carries the main landmark itself, since nothing above it does: the root layout stops at <body>. The links are the agent-friendly half of a 404: a real status plus where to look next (docs, llms.txt, sitemap), in the raw HTML; markdown clients get the same from lib/llms.ts markdownNotFound.
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col">
      <RouteNotFound
        action="Back home"
        className="flex-1"
        description="This page does not exist, or it moved. Check the address, or head back to the start."
        href="/"
        links={[
          { href: "/docs", label: "Documentation" },
          { href: "/llms.txt", label: "llms.txt" },
          { href: "/sitemap.xml", label: "Sitemap" },
        ]}
        title="Page not found"
      />
    </main>
  )
}
