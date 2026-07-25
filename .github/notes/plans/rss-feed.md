# RSS feed

## Concern

The blog ships machine-readable routes for agents (`/blog.md`, `/llms.txt`, `/llms-full.txt`) but nothing for humans' feed readers. A design critique flagged this as an inconsistency on a surface that advertises agent-readability as a feature: `/rss.xml`, `/feed.xml`, and `/blog/rss.xml` all 404 while the agent routes return 200.

## Context

A working implementation was built and then removed on PR #744 before merge. It lived at `web/next/src/app/rss.xml/route.ts`: RSS 2.0, `force-static` with `revalidate = 60`, gated on the same `getPublishedBlogPosts()` seam `sitemap.ts` uses so drafts could not leak, `dc:creator` rather than the RSS-invalid `<author>` display name, every interpolated value XML-escaped, and advertised via `alternates.types` in the root layout for autodiscovery. It served 200 with a valid document over the three published posts. The commit history on that branch has it if it is wanted back.

## Open question

Whether the starter should ship a feed at all. It is a fork-inherited surface, so every downstream site carries it, and no reader demand has been observed. Against that, it is small, has no dependencies, and reuses the publish gate that already exists. Undecided: shipping it by default, putting it behind a feature flag alongside `docs`/`blog`/`waitlist`, or leaving it out and letting a fork add it.
