---
name: design
description: Follow and maintain the app's UI conventions. Use when doing UI, styling, or component work (color, cursor, layout, spacing, typography), or when making or changing a design-system convention.
source: local
---

# Design Conventions

The maintainer owns the design language, so propose a new token choice first. A marketing fact below holds for the canonical starter only, since `app/(marketing)/` and `components/marketing/` are fork-excluded.

## Principles

- **Defaults first.** A primitive renders bare at its defaults (`<Spinner />`, not `<Spinner className="size-5" />`), and a class lands only where one spot needs it; per-instance overrides are how drift starts.
- **One source per concern.** Shared styling lives in the component or its variant, not at call sites. Brand identity (name, description, social links) is `@packages/config/site`.

## Cursor

`cursor-pointer` means "this changes the route": a link, a `Button` rendered as `<Link>` or `<a>`, a `router.push`. An action control (submit, dialog or menu trigger, toggle, mutation, sign-in, sign-out) keeps the native arrow even when the action eventually navigates: classify by element, not by side effect. In practice no class is written, since `<a href>` and `<button>` show the right cursor natively and `buttonVariants` sets none. The one restoration is a navigation item inside a `DropdownMenuItem` (`render={<Link />}`), which takes an explicit `cursor-pointer` back from the primitive's own cursor; a readOnly button-like input (`DocsSearch`) takes `cursor-default` over the text I-beam.

## Spacing and page frame

Spacing stays on the Tailwind scale, snapped to the nearest step (`gap-8`, not `gap-7.5`), and `gap-2` is the workhorse for a tight cluster. A dashboard or console page sits in the collapsible `SidebarShell` and wraps its content in `PageShell`, which owns centering, width and padding through its `size` variant; the title, description and actions row is `PageHeader` (all three in `components/shell/`). Marketing pages share one vertical scale, `py-24` sections and a `px-4 md:px-6` gutter.

## Typography

Exactly one `h1` per page, the page title (`PageHeader` renders it in the app shell; a marketing, docs or blog page renders its own), then `h2` and below with no skipped level, all on the existing type scale and tokens. A marketing heading is `font-bold`, a sub-heading within a section stays lighter (a `font-semibold` `h3`) to hold the hierarchy, and non-heading display text follows its own weight.

## Color

Color is a semantic token (`text-muted-foreground`, `bg-card`, `bg-sidebar`, and friends), in classNames and inline styles alike; the takumi OG image (`lib/og-image.tsx`) alone carries literals, having no theme context. Every `dark:` pairs with a token. Success is the `--success` token, mirroring `--destructive` and foreground-less like it: `text-success`, `bg-success/10`, `border-success/20`.

## Layout and landmarks

- One `main` per page, from the route-group layout where one renders it (`SidebarShell` for dashboard and console, docs, blog) and from the page itself elsewhere; the root layout renders none, or landmarks nest.
- A page that renders its own `main` (marketing, docs, blog, `not-found`) puts footer content in a `footer` beside it, so the page exposes a `contentinfo` landmark; nothing to put there means no footer. A page inside `SidebarShell` has no page footer, since the shell owns `main` and a `footer` inside it is only a section footer.
- A `section` with a visible heading is named by `aria-labelledby` on that heading's id, since a hand-written `aria-label` leaks authoring vocabulary ("Hero") into the accessibility tree; a wrapper with no visible heading (a `role="region"` scroll container) takes `aria-label`.
- A scrollable region (a code block, a wide table) carries `tabIndex={0}` and an accessible name, or its overflow is unreachable by keyboard.
- A top-level full-height surface (the body, a marketing page, the `SidebarShell` root) is `min-h-svh`, matching the shadcn sidebar; a surface nested in the shell's content pane (a route `error`, page content) fills it with `flex-1`, since that `main` is already full height. The one place `h-svh` is written is a console page hosting a full-height table: it passes `flex h-svh flex-col` to `PageShell` and `flex-1 min-h-0` down to the scroll region, since a `min-h-svh` ancestor is not a definite height.

## Motion

A looping or auto-playing animation is gated on reduced motion: `motion-safe:` for a Tailwind utility (`motion-safe:animate-pulse`); a keyframe Tailwind does not ship is declared beside the section that uses it, inside `@media (prefers-reduced-motion: no-preference)`, so marketing keyframes stay out of `globals.css`. Anything moving longer than five seconds also pauses on hover and `focus-within`, so a keyboard user can stop it (WCAG 2.2.2).

## Components

- **Badges and identity:** a pill is `Badge` (a variant, plus a className for a semantic color like `text-success`); an identity row (avatar, name, email) is `Item` with `ItemMedia` and `ItemContent`. Two stay hand-rolled: the sidebar trigger identity inside `SidebarMenuButton`, where the chevron is a sibling, and the landing page's larger `Eyebrow` pill, since `Badge` is sized for compact UI.
- **Dialogs:** `DialogContent` renders bare at its default width; a dialog that needs more (the auth dialog's `max-w-md`) is the exception that earns its class.
- **Empty states:** an empty state is `Empty`.
- **Forms:** native `form`, then `FieldGroup`, then `form.Field`, then `Field` with `FieldLabel`, `Input` and a conditional `FieldError`, on `@tanstack/react-form` with zod; `FieldGroup` owns the vertical rhythm, and labels and errors come from the `Field` stack (`FieldError` takes `errors={field.state.meta.errors}`).
- **Icons:** `@remixicon/react`.
- **Loading:** a wait is `<Spinner />`, bare, inside the surface that is waiting. The authed route groups carry no route `loading.tsx`: a segment's boundary wraps its page, not the slow layout above it, so the fallback would cover a page that was never the wait.
- **Primitives (`components/ui/*`):** extending one is a `shadcn-sync` override.
- **Toasts:** `toast.add({ title, type })` from `@/components/ui/toast`, rendered by the `Toaster` in `providers.tsx` and used as the component ships (no wrapper, no toast library), so a sync carries nothing for it; the surface stays neutral and the kind shows in the icon, red for an error.

## Data tables

A table composes the `components/data-table.tsx` family; its leading comments and `lib/data-table-layout.ts` hold the mechanics (in the canonical starter, the `manage/data-tables` docs page too), and the console users table is the reference. Every table scrolls infinitely in its region. Features register once in `lib/data-table-features.ts`, so every table shares them, and a table's own files carry `"use no memo"`, as the reference does.

- A column id says what the column shows, not the backing field (`status` over `banned`). A sortable column takes `extra` over `width`: the auto path reserves room for the sort button, a fixed width clips the header.
- A select column exists only with a selection action and stays left-aligned; those actions go in `selectionActions`, the bar that floats over the table while rows are selected and ends in Cancel. The toolbar's `actions` slot holds table-level actions.
- Cells are plain text through `DataTableCellText` (truncate with a tooltip by default, `wrap: true` to fold), with no badge in a cell for now; one control only where it is the row's primary action (the role `Select`). A column marked `flex` takes the remaining width (the last one that can grow), so no spacer column is added.
- Sort UI is a plain label plus a bare icon-only button toggling asc and desc (icon before the label on a right-aligned column); hiding lives in `DataTableViewOptions`. Every table shows a single `defaultSorting`.
- A time column reads relative through `relativeTime(value, now)` from `@/lib/time` (`5 min. ago`, `just now` under a minute), since a reader scanning a log wants how long ago; an absolute time is for what leaves the screen (a copy, an export, an API response). A row with nothing to show renders `-`.

## Naming

- Components group by domain folder (`blog/`, `common/`, `console/`, `dashboard/`, `docs/`, `marketing/`, `shell/`, `ui/`) in kebab-case files. A single-component file's basename matches its export; a multi-export slot file is `<area>/sidebar.tsx`; a context module is named for what it carries and its exports share that prefix (`console/role.tsx`: `ConsoleRoleProvider`, `useConsoleRole`); a cross-domain family is one top-level file whose exports share the family prefix, the shadcn single-module pattern (`data-table.tsx`: `DataTable`, `DataTableToolbar`, `useDataTable`).
- Sidebar slot exports domain-prefix the generic-role names (`Footer`, `Header`, `Nav`, `Search`) so they never collide across areas (`ConsoleNav`, `DashboardFooter`, `DocsSearch`); a distinctive content name stays bare (`CopyAsMarkdown`, `OrgSwitcher`), since a prefix on a self-explaining name is redundant.
- `shell/` holds the shared app-shell chrome as two families, `Sidebar*` and `Page*`; "shell" means structural scaffolding, not one component.

Done when a new surface reads against each section above and `ui-verify` shows it in both themes at three viewports.
