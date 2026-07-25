# Platform data table (PRD)

- Status: planned
- Links: PR #753 (this plan); working spike on `spike/platform-data-table` (~40 commits of iteration, all requirements below verified live there); shadcn data-table guide; TanStack Table v8 virtualized-infinite-scrolling example

One data table for the whole platform, rebuilt clean from this spec. The spike proved every requirement end to end but its history is iterative churn; the rebuild implements this document directly and ports code from the spike where it is already right. Every requirement below was converged on deliberately, most after seeing the alternative fail.

## Stance

- The shadcn stance, held throughout: no all-in-one `<DataTable data={...} />` prop machine. The page owns its `useReactTable` instance; the family provides composable pieces.
- Follow documented upstream patterns, never hand-rolled ones: TanStack Table v8 (headless), TanStack Query `useInfiniteQuery` (batches), TanStack Virtual (windowed rows, per their official virtualized-infinite-scrolling example), nuqs (URL state), `@chenglou/pretext` (text measurement).
- Every table infinite-scrolls inside its own region. No numbered pagination anywhere.
- Cells render plain text for now: no badges, avatars, or icons in data cells (the payload keeps `image`/`emailVerified` for a later visual treatment).

## Architecture

```
components/data-table/            the family: generic rendering, no data knowledge
  data-table.tsx                  DataTable (namesake file matches the export)
  cell-text.tsx                   DataTableCellText: truncate | wrap overflow modes
  column-header.tsx               DataTableColumnHeader: title + bare sort icon
  column-manager.ts               COLUMN_MANAGER + applyColumnManager (all layout)
  faceted-filter.tsx              DataTableFacetedFilter (Popover + Command)
  toolbar.tsx                     DataTableToolbar (search + children slot + View)
  view-options.tsx                DataTableViewOptions (labels from meta.label)
hooks/
  use-data-table.ts               server wiring: URL state + infinite query + table
  use-data-table-state.ts         URL layer alone (client-side tables)
app/(console)/console/(platform)/users/
  page.tsx                        synchronous server component (no page gate)
  components/data-columns.tsx     content only: header, cell, meta.label
  components/data-table.tsx       UsersDataTable: fetchPage + composition
api/hono/src/
  middlewares/admin.ts            adminMiddleware (fresh role check)
  routers/admin.ts                GET /api/v1/admin/users
```

- Route-colocated files are role-named; the page context lives in the export (`UsersDataTable`), not the filename. Family namesake file matches its export (`data-table/data-table.tsx` = `DataTable`).
- The console gets a grouped sidebar (Getting Started > Documentation, Platform > Users) with `/console` a minimal landing; the users table lives at `/console/users` in a `(platform)` route group. Nav blocks are a typed `navGroups` array; the header Dashboard link matches `exact` so child routes do not highlight it.

## Column manager

`COLUMN_MANAGER` in the family owns every table's layout so columns files carry content only. Two levels: `global` (semantic archetypes) and `<area>.<table>` blocks written in column order, mapping column ids onto configs:

```ts
type ColumnConfig = {
  align?: "center" | "left" | "right" // default left
  extra?: number // allowance over a measured title (default 10)
  flex?: boolean // default false
  width?: number // spacing units; omit = measure the header
}
```

- Units are Tailwind spacing units (1 = 0.25rem), rendered `calc(var(--spacing) * n)` so tables ride the theme token and user font-size; archetypes snap to multiples of 3. `width` is exact on a fixed column and the floor on a flex one.
- Omit `width` and the column sizes as header title + `extra`: the `meta.label` measured via pretext (`measureNaturalWidth(prepareWithSegments(label, "500 14px " + body font))`), px converted at 4px/unit, snapped up to the 3-unit grid, cached per label+allowance. Measurement runs post-mount only (SSR has no canvas): server and hydration renders share a 24-unit fallback, then one settle applies measured widths, avoiding hydration mismatch.
- Names follow what the column says, never the backing field: the column headed Status keys as `status` with `accessorKey: "banned"` underneath.
- `global` keeps only consumed archetypes; columns files never carry raw numbers; a deliberate one-off number lives in the table block.
- The users block converged to: `select { width: 12 }`, `name { extra: 48 }` (header + 12rem), `email { extra: 60, flex: true }`, `role {}`, `status {}`, `createdAt { align: "right", extra: 24 }`, `actions { align: "center", width: 12 }`. Role and status center; select stays left deliberately (see slack model).
- `applyColumnManager(columns, manager, measure)` folds a block into defs by column id (`id`, else `accessorKey`), setting `size` and `meta { align, flex }`; `useDataTable` applies it via its `manager` option, client tables call it directly.

## Slack model (who grows)

- `flex` marks a column; capability reaches back to every column before it. Of the visible capable columns, only the last grows (a run of adjacent capables collapses); the rest hold their width. Hiding the growing column hands growth backward: hide email and name grows; hide both and select grows, which reads well only because select is left-aligned: the checkbox pins left and the empty box is the gap, with the remaining columns docked right.
- A table with no flex column spreads its widthless columns instead (they share slack above their floors).
- Explicit alignment: `center` drops horizontal padding (the shadcn cell strips `pr` around checkboxes, skewing a padded center; measured symmetric after). Dead space must never trail the row.
- A `spacer` pseudo-column was tried and rejected; the flags + alignment model above is the answer.

## Behaviors

- Virtualized infinite scroll per the upstream example: semantic table tags flipped to grid/flex, rows absolutely positioned in a virtualizer-sized tbody, self-measured, `overscan: 5`; load more within 500px of the bottom, on scroll and after every batch. `getNextPageParam` compares loaded against the response `total` AND terminates on a zero-row page (stale totals must not loop). `onLoadMore` holds a stable identity (`useCallback`) so the effect does not re-arm per render.
- 25-row batches, `placeholderData: keepPreviousData`, search through `useDeferredValue`. Sorting/search/filter changes scroll back to top (state-slice effect deps, not JSON.stringify).
- URL state via nuqs: `q`, `sort` as `column.asc|desc` (custom parser with parse/serialize/eq), one array param per filter id. No page state. Parser maps must be module-scope stable (see traps).
- `defaultSorting` (users: createdAt desc) applies as real table state when the URL has none, so the header chevron and `aria-sort` show it while the URL stays clean.
- Sort UI: title is plain text (aligns with cell content natively; no margin nudges needed); the only control is a bare icon (native `button`, focus ring only, `aria-label="Sort by X"`), toggling asc/desc. No dropdown; Hide lives in View options. Right-aligned headers put the icon before the title.
- `DataTableCellText` overflow modes: `truncate` (one line, ellipsis, tooltip only when actually cut, measured `scrollWidth > clientWidth` on hover/focus) and `wrap` (`whitespace-normal wrap-break-word`; the measured virtual row grows). Web terminology, not invented terms.
- Selection: `id: "select"` column convention; the count line gates on that column's presence (tanstack injects a default `onRowSelectionChange`, so the option cannot gate it); selection resets when search/sort/filters reshape the result set.
- Errors: cold failure renders the `empty` slot (Empty + message + Retry); failures after rows exist render an inline retry strip (stale rows must not sit silent under `keepPreviousData`).
- Status line under the region: selection count left, `N of total` right.
- Viewport filling: the page opts in with `h-svh` on `PageShell` plus `flex-1 min-h-0` down to the region. `min-h-svh` ancestors are height-indefinite, so without the definite `h-svh` the region grows with content, the page scrolls, and the always-visible bottom loads every batch at once.
- The page stays a synchronous server component with no `assertConsoleAccess` of its own: the layout 404s non-admins and the API gates every row, so the shell paints instantly (~150ms) instead of suspending into the route spinner (no double loading phase).
- Narrow viewports: fixed columns `shrink-0`, flex floors via `min-width`, table `min-w-max`; the region scrolls horizontally instead of crushing cells (verified at 375px).
- Dev-only alternating column tints were a useful width-tuning aid and are intentionally NOT part of the final build.

## API

`GET /api/v1/admin/users`, drizzle-direct, standard envelope + OpenAPI + RPC:

- Query: `dir` (asc|desc, default desc), `page` (min 1), `perPage` (1..100, default 10), `q` (trimmed, max 254), `role` (comma list validated against ["admin","user"], deduped), `sort` (whitelist enum, default createdAt).
- One `SORTS` tuple feeds the zod enum and a `sortColumns` map (`satisfies Record<(typeof SORTS)[number], unknown>`); sortable: banned, createdAt, email, name, role. `banned` sorts via `coalesce(banned, false)`; `role` via `coalesce(role, 'user')` so null-role rows group with the label they display.
- Search: `ilike` across name OR email with `%_\` escaped so literals match; role filter treats null as "user"; `asc(user.id)` tiebreaker so page boundaries cannot drift; count via `db.$count(user, where)` per batch (comment: fine at starter scale; page-1-only or pg_trgm at scale).
- Response: `{ data: { total, users } }`, `createdAt` serialized `toISOString()` (Hono types a raw Date as string over RPC otherwise), `banned` normalized to boolean, `role` null-as-"user". Payload includes `image` and `emailVerified` even though cells do not render them yet.
- `adminMiddleware` mirrors the console gate's rule AND freshness: it re-reads the session with `disableCookieCache: true` (a revoke locks the API on the very next request; the cached `authMiddleware` read alone leaves a 5-minute window) and refreshes the context vars. 403 `FORBIDDEN` via `forbiddenErrorResponses`; add both to `lib/error.ts`.
- Client: `fetchPage` maps column ids to API sort fields (`status` -> `banned`) through a `SORT_FIELDS` map `satisfies Record<string, UsersSort>` where `UsersSort` derives from `InferRequestType`, so server renames become compile errors. The row type derives from `InferResponseType` (no hand-written mirror).

## Accessibility

- The scroll region is named and focusable (`role="region"`, `aria-label`, `tabIndex={0}`).
- Grid/flex display strips implicit table semantics, so every structural role is restated (`table/rowgroup/row/columnheader/cell`) and virtualization reports `aria-rowcount` (full set) + per-row `aria-rowindex`; `aria-sort` on sorted columnheaders.
- Labeled search input, sr-only names on icon-only controls, tooltip content mirrors the truncated value.

## Traps the rebuild must honor (each cost real debugging in the spike)

1. React Compiler x TanStack Table v8: the table mutates one stable instance during render; memoized consumers freeze one render behind (sorts update the URL but not rows, `getPageCount` sticks). Every file reading a `table`/`column` instance carries `"use no memo"`, including the hooks that call `useReactTable`.
2. nuqs parser identity: parser maps built inline in a hook defeat the parse cache and leave `useSyncExternalStore` one update behind. Module-scope (or per-instance-stable) parser objects only.
3. tanstack `defaultColumn.minSize` defaults to 20 (pixel-minded): it clamps spacing-unit sizes (12 rendered as 20). Set `defaultColumn: { minSize: 0 }`.
4. `useInfiniteQuery` option order: `queryFn` must precede `getNextPageParam` or TS context-sensitive inference degrades `lastPage` to unknown.
5. Next `next dev` forces `NODE_ENV=development`; the repo's `NODE_ENV=local` never reaches the client bundle. Client-side env gates use `isDevelopment`/`!isProduction`, never `isLocal`.
6. `docs.config.ts` is the docs source of truth: `meta.json` and MDX frontmatter regenerate from it; editing them directly gets reverted by the docs script.
7. Better Auth cookie cache (300s) serves stale roles; any fresh-role check needs `disableCookieCache` (the console gate and adminMiddleware both).
8. Tailwind v4 renamed `break-words` to `wrap-break-word`.
9. The npm package is `@chenglou/pretext` (bare `pretext` is unrelated); width comes from `measureNaturalWidth(prepareWithSegments(...))`.
10. `getSize()` and the virtualizer think in numbers the renderer interprets; keep the calc(var(--spacing)) conversion in exactly one place (`columnLayout`).

## Rebuild plan

1. Deps: `@tanstack/react-table` `^8.21.3`, `@tanstack/react-virtual`, `nuqs` (+ `NuqsAdapter` in providers), `@chenglou/pretext` (catalog, caret).
2. API first (middleware + endpoint + error responses), curl-verified: 200 matrix, 401, 403-after-revoke with cache-intact cookies, 400 issues.
3. Family + hooks per this spec, porting from the spike.
4. Console IA (sidebar groups, `(platform)/users`, landing) and the users table.
5. Docs (`manage/data-tables` + touched pages) and skills (`design`, `api-endpoint`, `codebase-map`) in the same change; agent-browser verification at desktop and 375px, both themes; no screenshots with real user rows in the PR (verification stays textual).
