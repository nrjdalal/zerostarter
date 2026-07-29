---
name: design
description: Follow and maintain the app's UI conventions. Use for any UI, styling, or component work (spacing, color, cursor, layout, typography), or when making or changing a design-system convention.
source: local
---

# Design Conventions

When a change establishes or alters a convention, update this file in the same change so it never drifts. Propose a genuinely new design-token choice before committing; the maintainer owns the design language.

## Principles

- **Defaults first.** Use primitives bare at their defaults and add a class only where a spot genuinely needs it. Per-instance overrides are how drift starts. Example: `<Spinner />`, not `<Spinner className="size-5" />`.
- **One source per concern.** Shared styling lives in the component or its variant, never copy-pasted across call sites. Brand identity (name, description, social links) is `@packages/config/site`.

## Cursor

`cursor-pointer` is for navigation only: links, anchors, a Button rendered as `<Link>` or `<a>`, a `router.push`. It signals "this changes the route."

- Action controls (form submit, dialog/menu triggers, toggles, mutation buttons, sign-in, sign-out) keep the native arrow even when the action eventually navigates: classify by element, not by side effect.
- In practice you need no `cursor-pointer` class: `<a href>` shows the pointer natively, `<button>` shows the arrow natively, and `buttonVariants` sets no cursor. A readOnly button-like input (the docs search trigger, `DocsSearch` in `components/docs/sidebar.tsx`) uses `cursor-default` to avoid the text I-beam.
- Exception: some primitives set their own cursor (`DropdownMenuItem` hard-codes `cursor-default`). A navigation item inside one (a `render={<Link/>}` menu item) needs an explicit `cursor-pointer` to restore the pointer the base overrode.

## Spacing

- Stay on the Tailwind scale and snap to the nearest step; no off-ladder one-offs (`gap-7.5`, `size-4.5`, `w-45`, `mb-18`, `text-[0.6rem]`).
- `gap-2` is the workhorse for tight clusters.
- Dashboard and console pages use the collapsible `SidebarShell` (`components/shell/sidebar-shell.tsx`) and wrap content in `PageShell` (`components/shell/page-shell.tsx`), which owns `mx-auto` + width + `p-4 sm:p-6` via a `size` variant (`sm`/`md`/`lg`/`full`, default `md` = `max-w-4xl`). The title/description/actions row is `PageHeader` (`components/shell/page-header.tsx`). Never hand-roll `mx-auto`/`max-w-*`/`p-*` or the header layout.
- Marketing pages share one vertical scale: `py-24` sections and a `px-4 md:px-6` container gutter.

## Typography and headings

- Exactly one `<h1>` per page (the page title); sections use `<h2>` and below, never skipping a level.
- Use the existing type scale and tokens; no off-scale font sizes.
- Marketing-page headings are `font-bold`. A sub-heading within a section stays lighter (a `font-semibold` `h3`) to preserve hierarchy; non-heading display text (a stat value) follows its own weight.

## Color and theming

- Semantic tokens only: `text-muted-foreground`, `bg-card`, `border-border`, `bg-sidebar`, and friends. No hardcoded hex, rgb, or hsl in classNames or inline styles. The one exception is Satori-rendered OG images, which have no theme context.
- Dark mode is `next-themes` (`attribute="class"`, `app/providers.tsx`); pair every `dark:` with a token.
- Success uses the `--success` token (green-600 light, green-500 dark, mirroring `--destructive`): `text-success`, `bg-success/10`, `border-success/20`. It is foreground-less, like `--destructive`.

## Layout and landmarks

- Each top-level page wraps its content in a single `<main>`. Route-group layouts (dashboard via `SidebarShell`, docs, blog) already render their own `<main>`, so add none to the root layout or you nest landmarks.
- A surface that has footer content renders it in a real `<footer>` as a sibling of `<main>`, never a `<div>` inside it, so the page exposes a `contentinfo` landmark. A surface with nothing to put there renders no footer rather than an empty one.
- Name a `<section>` that has a visible heading with `aria-labelledby` pointing at that heading's id, not a hand-written `aria-label`: internal authoring vocabulary ("Hero", "Call to action") otherwise leaks into the accessibility tree as the region's name. A wrapper with no visible heading (a `role="region"` scroll container) still takes `aria-label`.
- A scrollable region (a code block, a wide table) needs `tabIndex={0}` and an accessible name, or its overflow is unreachable by keyboard.
- Top-level full-height surfaces (the body, marketing pages, the `SidebarShell` root) use `min-h-svh`, matching the shadcn sidebar; no `dvh`. A surface nested inside the shell content pane (route `error`/`loading`, dashboard/console content) fills it with `flex-1`: the shell `<main>` is `flex min-h-svh min-w-0 flex-1 flex-col`, so do not re-assert `min-h-svh` inside an already-full-height parent.

## Motion

- Every looping or auto-playing animation is gated on reduced motion. For a Tailwind utility use the `motion-safe:` variant (`motion-safe:animate-pulse`). For a keyframe Tailwind does not ship, declare it next to the section that uses it and wrap the rule in `@media (prefers-reduced-motion: no-preference)`; marketing keyframes stay out of `globals.css`.
- Anything that moves for more than five seconds also needs a pause affordance, on both hover and `focus-within`, so a keyboard user can stop it (WCAG 2.2.2).

## Components

- **Loading:** `<Spinner />`, bare, at its default `size-4`. Never hand-roll `RiLoaderLine`.
- **Empty states:** the `Empty` primitive (`EmptyHeader` / `EmptyMedia` / `EmptyTitle` / ...). Do not hand-roll empty messages.
- **Badges and pills:** prefer `<Badge>` (with a variant, plus className for a semantic color like `text-success`) over a hand-rolled rounded-full span. Identity rows (avatar + name + email) use `Item` / `ItemMedia` / `ItemContent`. Exceptions: the sidebar trigger identity stays hand-rolled inside `SidebarMenuButton` (the chevron is a sibling there); the marketing landing (`web/next/src/app/(marketing)/page.tsx`) hand-rolls a larger `Eyebrow` pill for section eyebrows and the hero badge, since `<Badge>` is sized for compact UI (`h-5`, `text-xs`).
- **Forms:** native `<form>` then `<FieldGroup>` then `<form.Field>` then `<Field>` + `<FieldLabel>` + `<Input>` + conditional `<FieldError>`, with `@tanstack/react-form` + zod. Let `FieldGroup` own the vertical rhythm (no second `space-y-*`). Do not hand-roll labels or error markup.

- **Dialogs:** bare `<DialogContent>` is centered at `sm:max-w-sm`. The auth dialog (`components/common/access.tsx`) uses `max-w-md`.
- **Icons:** `@remixicon/react` only. `size-4` inside buttons by default.
- **shadcn (`components/ui/*`):** customize only via `.github/scripts/shadcn-customize.ts` (the sync wipes and re-scaffolds `ui/`). Extend the primitive in place; do not fork a copy.

## Data tables

Every table uses the `components/data-table.tsx` family; do not hand-roll a `<Table>` with its own state. The full architecture and behaviors live in the `manage/data-tables` docs page; the sharp-edge rationale is commented in the module at each site it bites. The pure table logic (width measurement, the column-config fold, the slack rule, and the sort-whitelist lookup) lives in `lib/data-table-layout.ts` and is unit-tested, so change it there and add a case rather than tweaking widths in the renderer.

- Toasts are raised with `toast.add({ title, type })` from `@/components/ui/toast`, the manager the component itself exports, and are rendered by the `Toaster` mounted in `providers.tsx`. `type` is `error`, `success`, `warning`, `info` or `loading`. No wrapper and no toast library: the component is used the way it ships, so a sync never has to re-apply anything for it. The surface stays neutral and the kind shows in the icon, red for an error.
- Selection actions live in `selectionActions` on `DataTable`, which floats them in a bar over the bottom of the table while rows are selected and always ends them with Cancel. Do not put them in the toolbar, whose right side is for table-level actions like adding a row. Add a select column only when the table has such an action.
- Compose headless: the page owns the TanStack Table instance (`useDataTable` for server-driven, `useDataTableState` + row models for client-side) and renders `DataTableToolbar` + `DataTable`. Infinite scroll with virtualized rows everywhere; never numbered pagination.
- Layout lives in a colocated `Record<string, ColumnConfig>` in the table's `data-columns.tsx`, written in column order; never put widths inline in column defs. Widths are Tailwind spacing units; omit `width` to size from the measured `meta.label` plus `extra` (default 10, snapped to the 3-unit grid), measured from build-time font metrics rather than at runtime.
- One `flex: true` column grows; the capability reaches back to every column before it and the last visible capable column takes the slack. Keep a select column left-aligned so inherited growth reads as gap. No trailing spacer columns.
- Prefer `extra` over an explicit `width` on a sortable column: the auto path reserves the allowance for the sort button, a fixed width reserves nothing and the header cell clips.
- A time column renders a relative time through `relativeTime` from `@/lib/time` (`5 min. ago`, `just now` under a minute), not a formatted date, because a reader scanning a log wants how long ago rather than a calendar lookup. Absolute times are for what leaves the screen: a copy, an export, an API response. A row with nothing to show renders `-` rather than an empty cell.
- Column ids say what the column shows, not the backing field (`status` over `banned`), and `meta.label` is the single source for header text, measured width, and the view-options entry (`DataTableColumnHeader` takes no title prop). Cells are plain text via `DataTableCellText` (truncate + tooltip by default, `wrap: true` to fold); no badges in cells for now. The exception is a cell whose control *is* the row's primary action and belongs on the row rather than behind a menu: the console's role cell is a `Select`, because changing a rung is the one thing that table exists to do. One control, never a cluster.
- Sort UI is a plain label plus a bare icon-only sort button toggling asc/desc (icon before the label on right-aligned columns); hiding lives in `DataTableViewOptions`. Give the table a visible `defaultSorting`; tables are single-sort.
- Any file that reads a `table`/`column` instance needs the `"use no memo"` directive, or the React Compiler freezes it one render behind.
- A page hosting a full-height table passes `className="flex h-svh flex-col"` to `PageShell` and keeps `flex-1 min-h-0` on every wrapper down to the region; `min-h-svh` ancestors are not definite, so the flex chain would not fill.

## File and export naming

- Components are grouped by domain folder (`common/`, `shell/`, `console/`, `dashboard/`, `docs/`, `blog/`, `marketing/`, `ui/`), with kebab-case file names. A single-component file's basename matches its export; a multi-export slot file is named `<area>/sidebar.tsx` (console, dashboard, docs) and its exports follow the sidebar-slot rule below. `docs/` holds one of each (`docs/sidebar.tsx` + `docs/copy-as-markdown.tsx`). A domain folder may also hold a context module named for what it carries, whose exports share that name as their prefix (`console/role.tsx` exports `ConsoleRoleProvider` and `useConsoleRole`). A cross-domain family follows the shadcn single-module pattern as one top-level file whose exports share the family prefix: `data-table.tsx` exports `DataTable`, `DataTableToolbar`, `useDataTable`, and friends.
- Sidebar slot exports follow one rule: domain-prefix the generic-role names (`Nav`, `Header`, `Footer`, `Search`) so they read unambiguously and never collide across areas (`console/sidebar.tsx` imports `DocsNav`). So `ConsoleNav`, `ConsoleHeader`, `DashboardFooter`, `DocsNav`, `DocsFooter`, `DocsSearch`. Leave a distinctive content name bare (`OrgSwitcher`, `CopyAsMarkdown`): a domain prefix on a self-explaining name is redundant.
- `shell/` holds the shared app-shell chrome as two families, `Sidebar*` (`SidebarShell`, `SidebarAdaptive`, `SidebarFloatingTrigger`, `SidebarDropdownMenu`, `SidebarUserMenu`) and `Page*` (`PageShell`, `PageHeader`). "Shell" denotes structural layout scaffolding, not one specific component.

## Open decisions

None open. Resolved decisions fold into the sections above; add new ones here (move up once chosen).
