---
name: docs
description: Discover, read, and keep in sync the Fumadocs documentation site (web/next/content/docs). Use whenever you need to learn how something in this template works, and whenever you add / remove / rename / reorder a doc page or ship a feature whose behavior is described in docs.
---

# docs

The canonical documentation for this template is the Fumadocs site under `web/next/content/docs/`. It's the source of truth that survives across agent sessions and forks — keep it correct and it keeps you correct.

---

## Reading

Always prefer the Fumadocs site over re-deriving behavior from source.

### AI-friendly endpoints

Published site (this project): `https://zerostarter.dev` — forks will have their own deployment, read from `NEXT_PUBLIC_APP_URL`.

- `<site>/llms.txt` — compact index of every page.
- `<site>/llms-full.txt` — the entire docs + blog concatenated into one page. Use this to load "everything" into context.
- `<site>/docs/<slug>.md` or `.txt` — any page as plain text. Prefer this over rendering HTML.
- `<site>/blog/<slug>.md` works the same.

Routes that serve these: `web/next/src/app/(llms.txt)/**` and `next.config.ts` rewrites.

### When the deployed site isn't reachable

Read MDX directly:

- Docs: `web/next/content/docs/**/*.mdx`
- Blog: `web/next/content/blog/**/*.mdx`
- The `meta.json` next to each folder gives canonical page order.

### Choosing what to read

1. Start from `/llms.txt` (the index) to find the right page.
2. Pull the specific page as `.md` rather than fetching the full docs.
3. Only pull `/llms-full.txt` when you genuinely need cross-page context.

---

## Syncing

**Rule:** if you change behavior that's described in a doc page, update the doc page in the same change. If you add / remove / rename / reorder a page, update every touchpoint below.

### Tier 1 — every doc change must update these (MANUAL)

These are hand-maintained. Miss one and the page silently disappears from nav or llms.txt.

1. **`web/next/content/docs/meta.json`** (or `content/blog/meta.json` for blog)
   - Schema: `{ "pages": ["slug-without-extension", ...] }`
   - The array is the **ordered** page list used by the sidebar and by `llms.txt`. A page not listed here is invisible to both.
   - Add on new page, remove on delete, reorder to change sidebar order.

2. **`web/next/src/lib/config.ts` → `config.sidebar`**
   - Shape: `{ groups: [{ label, items?, collapsible?, categories? }] }`.
   - Groups with a flat list of pages use `items: [{ title, url }]`.
   - Groups split into sub-sections (like "Manage") use `collapsible: true` + `categories: { <SubSection>: [{ title, url }] }`.
   - `url` must match `/docs/<slug>` exactly.
   - Add on new page, remove on delete, move on rename. This is the rendered sidebar's source of truth — missing entries = missing links in prod. (`meta.json` is independently load-bearing for `llms.txt`, OG static params, and sidebar fallback, so both files must be correct for different surfaces.)

3. **`web/next/content/docs/index.mdx` → "Quick Links"** (for docs pages)
   **`web/next/content/blog/index.mdx` → "Recent Posts"** (for blog pages)
   - Hand-maintained markdown lists mirroring `meta.json` + sidebar structure.
   - Add a line: `- [<Title>](/docs/<slug>) - <one-line description>`.

### Tier 2 — auto, but depend on Tier 1 being correct

You don't touch these, but verify they still work:

- `web/next/src/app/(llms.txt)/llms.txt/[[...slug]]/route.ts` — uses `sortByMeta(pages, meta.pages, "/docs")`. Pages missing from `meta.json` vanish.
- `web/next/src/app/(llms.txt)/llms-full.txt/route.ts` — same dependency.
- `web/next/src/app/sitemap.ts`, OG route, search route, doc page route — auto-discover from `docsSource`. A page that lives on disk but is missing from Tier 1 will render at `/docs/<slug>` yet be unreachable through normal navigation.

### Tier 3 — update only when path or title changes

- **Root `README.md`** — has hand-written doc links (`/docs/getting-started/architecture`, `/llms.txt`, etc.) and a feature list that echoes stack info. On rename: rewrite those links. On feature change: reconcile.
- **`web/next/next.config.ts`** — has `/docs/:path.md` → `/llms.txt/docs/:path` rewrites. Touch only if the `/docs` URL prefix itself changes.
- **`web/next/source.config.ts`** — `dir: "content/docs"`. Touch only if the content directory moves.
- **`web/next/content/docs/manage/documentation.mdx`** — the page documenting this very process. Update it if `meta.json` / sidebar schema changes.

### Root `AGENTS.md`

`AGENTS.md` points agents at this docs pipeline. If you restructure the docs significantly (new top-level section, large section rename), update the intent-grouped listing in `AGENTS.md` so agents find the right page on first hop.

---

## Authoring

Every doc page must have:

```mdx
---
title: <Page Title>
description: <One-sentence summary. Used in metadata, OG images, search.>
---
```

- `title` and `description` are consumed by: the sidebar label fallback, the OG image generator (`/api/og/docs/...`), the search index (Orama), and the LLM markdown output.
- fumadocs-mdx components (`<Callout>`, `<Steps>`, `<Tabs>`, etc.) are available if you need them — most existing pages are plain Markdown.
- Links between pages use `/docs/<slug>` (not relative `.mdx` paths).

---

## Checklists

### Adding a new doc page

1. Create `web/next/content/docs/<section>/<slug>.mdx` with `title` + `description` frontmatter.
2. Add `"<section>/<slug>"` to `web/next/content/docs/meta.json` **at the correct position**.
3. Add an entry in `config.sidebar.groups` (inside the matching `label` → `items` or `categories.<SubSection>`).
4. Add a line in `web/next/content/docs/index.mdx` under the correct subsection.
5. If it's a feature users will discover from the README, also add it to the README feature list or doc links.
6. Run `bun dev` and open `/docs/<section>/<slug>`, plus click to it from the sidebar and from `/docs`. Hit `/llms.txt` and verify the slug is listed.

### Adding a new blog post

Blog is symmetric to docs but simpler — **no sidebar config to update** (the sidebar is docs-only).

1. Create `web/next/content/blog/<slug>.mdx` with `title` + `description` frontmatter.
2. Add `"<slug>"` to `web/next/content/blog/meta.json` at the correct position.
3. Add a line in `web/next/content/blog/index.mdx` under "Recent Posts".
4. If it's a launch-worthy post, add a link in the root `README.md`.
5. Run `bun dev`, hit `/blog/<slug>` and `/blog.md`, and confirm the slug appears in `/llms.txt`.

### Renaming or moving a page

1. Rename the MDX file.
2. Update its slug everywhere: `meta.json`, sidebar `url`, `index.mdx` link, any in-content cross-links, and the README.
3. Decide whether to add a redirect in `web/next/next.config.ts` — required if the old URL was public or indexed.

### Deleting a page

1. Delete the MDX file.
2. Remove the slug from `meta.json`, sidebar config, `index.mdx`, and any other MDX files that cross-link to it.
3. Remove any README link to it.
4. Add a redirect in `next.config.ts` if the URL was public.

### Changing feature behavior

1. Search `content/docs/` for the matching page (by keyword or file name).
2. Update that page's description of the behavior, options, and examples.
3. If screenshots or OG images depend on visible copy, regenerate them.
4. Include the doc update in the same commit / PR as the code change so review catches drift.

---

## Failure modes to avoid

- Editing an MDX file but forgetting `meta.json` → page exists at the URL but is invisible everywhere else.
- Editing `meta.json` but forgetting the sidebar config → page is in `/llms.txt` but not in the rendered sidebar.
- Renaming without updating `index.mdx` → homepage "Quick Links" go dead.
- Changing code without updating docs → forks inherit stale docs, and `/llms.txt` lies to future agents.
- Assuming fumadocs auto-discovers pages. It discovers their *existence* on disk, but `meta.json` controls *ordering and visibility* in the nav + llms.txt pipeline.
