---
name: design
description: Follow and maintain the app's UI conventions. Use for any UI, styling, or component work (spacing, color, cursor, layout, typography), or when making or changing a design-system convention.
---

# Design Conventions

When a change establishes or alters a convention, update this file in the same change so it never drifts. Propose a genuinely new design-token choice before committing; the maintainer owns the design language.

## Principles

- **Defaults first.** Use primitives bare at their defaults; add a class only where a specific spot genuinely needs it. Per-instance overrides are how drift starts. Example: `<Spinner />`, not `<Spinner className="size-5" />`.
- **One source per concern.** Shared styling lives in the component or its variant, never copy-pasted across call sites. Brand identity (name, description, social links) is `@packages/config/site`.

## Cursor

`cursor-pointer` is for navigation only: links, anchors, a Button rendered as `<Link>` or `<a>`, a `router.push`. It signals "this changes the route."

- Action controls (form submit, dialog/menu triggers, toggles, mutation buttons, sign-in, sign-out) keep the native arrow, even when the action eventually navigates: classify by element, not side-effect.
- In practice no `cursor-pointer` class is needed: `<a href>` shows the pointer natively, `<button>` shows the arrow natively, and `buttonVariants` sets no cursor. A readOnly button-like input (the docs search trigger, `DocsSearch` in `components/docs/sidebar.tsx`) uses `cursor-default` to avoid the text I-beam.
- Exception: some primitives set their own cursor (`DropdownMenuItem` hard-codes `cursor-default`). A navigation item inside one (a `render={<Link/>}` menu item) needs an explicit `cursor-pointer` to restore the pointer the base overrode.

## Spacing

- Stay on the Tailwind scale; snap to the nearest step, no off-ladder one-offs (`gap-7.5`, `size-4.5`, `w-45`, `mb-18`, `text-[0.6rem]`).
- `gap-2` is the workhorse for tight clusters.
- Dashboard and console pages use the collapsible `SidebarShell` (`components/shell/sidebar-shell.tsx`) and wrap content in `PageShell` (`components/shell/page-shell.tsx`): it owns `mx-auto` + width + `p-4 sm:p-6` via a `size` variant (`sm`/`md`/`lg`/`full`, default `md` = `max-w-4xl`). The title/description/actions row is `PageHeader` (`components/shell/page-header.tsx`). Never hand-roll `mx-auto`/`max-w-*`/`p-*` or the header layout.
- Marketing pages share one vertical scale: `py-24` sections and a `px-4 md:px-6` container gutter.

## Typography and headings

- Exactly one `<h1>` per page (the page title); sections use `<h2>` and below, never skipping a level.
- Use the existing type scale and tokens; no off-scale font sizes.
- Marketing-page headings are `font-bold`. Sub-headings within a section stay lighter (a `font-semibold` `h3`) to preserve hierarchy; non-heading display text (a stat value) follows its own weight.

## Color and theming

- Semantic tokens only: `text-muted-foreground`, `bg-card`, `border-border`, `bg-sidebar`, and friends. No hardcoded hex, rgb, or hsl in classNames or inline styles. The one exception is Satori-rendered OG images, which have no theme context.
- Dark mode is `next-themes` (`attribute="class"`, `app/providers.tsx`); pair every `dark:` with a token.
- Success uses the `--success` token (green-600 light, green-500 dark, mirroring `--destructive`): `text-success`, `bg-success/10`, `border-success/20`. Foreground-less, like `--destructive`.

## Layout and landmarks

- Each top-level page wraps its content in a single `<main>`. Route-group layouts (dashboard via `SidebarShell`, docs, blog) already render their own `<main>`, so add none to the root layout or you nest landmarks.
- Top-level full-height surfaces (the body, marketing pages, the `SidebarShell` root) use `min-h-svh`, matching the shadcn sidebar; no `dvh`. Surfaces nested inside the shell content pane (route `error`/`loading`, dashboard/console content) fill it with `flex-1`: the shell `<main>` is `flex min-h-svh min-w-0 flex-1 flex-col`, so don't re-assert `min-h-svh` inside an already-full-height parent.

## Components

- **Loading:** `<Spinner />`, bare, at its default `size-4`. Never hand-roll `RiLoaderLine`.
- **Empty states:** the `Empty` primitive (`EmptyHeader` / `EmptyMedia` / `EmptyTitle` / ...). Do not hand-roll empty messages.
- **Badges and pills:** `<Badge>` (with a variant, plus className for semantic color like `text-success`) over a hand-rolled rounded-full span. Identity rows (avatar + name + email) use `Item` / `ItemMedia` / `ItemContent`. Exceptions: the sidebar trigger identity stays hand-rolled inside `SidebarMenuButton` (the chevron is a sibling there); the marketing landing (`web/next/src/app/(marketing)/page.tsx`) hand-rolls a larger `Eyebrow` pill for section eyebrows and the hero badge, since `<Badge>` is sized for compact UI (`h-5`, `text-xs`).
- **Forms:** native `<form>` then `<FieldGroup>` then `<form.Field>` then `<Field>` + `<FieldLabel>` + `<Input>` + conditional `<FieldError>`, with `@tanstack/react-form` + zod. Let `FieldGroup` own the vertical rhythm (no second `space-y-*`). Do not hand-roll labels or error markup.
- **Dialogs:** bare `<DialogContent>` is centered at `sm:max-w-sm`. The auth dialog (`components/common/access.tsx`) uses `max-w-md`.
- **Icons:** `@remixicon/react` only. `size-4` inside buttons by default.
- **shadcn (`components/ui/*`):** customize only via `.github/scripts/shadcn-customize.ts` (the sync wipes and re-scaffolds `ui/`). Extend the primitive in place; do not fork a copy.

## File and export naming

- Components are grouped by domain folder (`common/`, `shell/`, `console/`, `dashboard/`, `docs/`, `blog/`, `marketing/`, `ui/`); file names are kebab-case. A single-component file's basename matches its export; a multi-export slot file is named `<area>/sidebar.tsx` (console, dashboard, docs) and its exports follow the sidebar-slot rule below. `docs/` holds one of each (`docs/sidebar.tsx` + `docs/copy-as-markdown.tsx`).
- Sidebar slot exports follow one rule: domain-prefix the generic-role names (`Nav`, `Header`, `Footer`, `Search`) so they read unambiguously and never collide across areas (`console/sidebar.tsx` imports `DocsNav`). So `ConsoleNav`, `ConsoleHeader`, `DashboardFooter`, `DocsNav`, `DocsFooter`, `DocsSearch`. Leave distinctive content names bare (`OrgSwitcher`, `CopyAsMarkdown`): a domain prefix on a self-explaining name is redundant.
- `shell/` holds the shared app-shell chrome as two families, `Sidebar*` (`SidebarShell`, `SidebarAdaptive`, `SidebarFloatingTrigger`, `SidebarDropdownMenu`, `SidebarUserMenu`) and `Page*` (`PageShell`, `PageHeader`). "Shell" denotes structural layout scaffolding, not one specific component.

## Open decisions

None open. Resolved decisions fold into the sections above; add new ones here (move up once chosen).
