import { execFileSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"

// Re-applies every local override after `shadcn-update.sh` wipes ui/ and re-scaffolds the app.
// Two strategies:
//   restore() — files we own outright; shadcn's version carries nothing we want, so reset to HEAD.
//   patch()   — registry components we extend in place; keep upstream improvements, re-apply only our delta.
// Patches are idempotent and assert their anchor, so a shadcn shape change fails the sync loudly
// instead of silently dropping an override. It runs between two format passes: anchors match the
// first pass's formatted shape, and the second pass reflows any destructure a new param re-wraps.

const log = (msg: string) => console.log(`[shadcn-customize] ${msg}`)

// init/add re-scaffold these with shadcn defaults we keep none of: a next/font/google layout, a
// stripped utils.ts, and catalog->pinned dep drift in package.json/bun.lock. Reset to HEAD.
const RESTORE = [
  "bun.lock",
  "web/next/package.json",
  "web/next/src/app/layout.tsx",
  "web/next/src/lib/utils.ts",
]
execFileSync("git", ["checkout", "HEAD", "--", ...RESTORE], { stdio: "inherit" })
log(`restored from HEAD: ${RESTORE.join(", ")}`)

// `add -a` force-bumps react-day-picker to v10 in node_modules; the restored lock pins ^9, so drop
// the v10 tree and let the wrapper's `bun i` reinstall v9 (a plain install won't downgrade it).
for (const dir of ["node_modules/react-day-picker", "web/next/node_modules/react-day-picker"]) {
  rmSync(dir, { recursive: true, force: true })
}
log("dropped react-day-picker node_modules (restored lock pins ^9)")

type Edit = { from: string; to: string }
const patch = (file: string, applied: (src: string) => boolean, edits: Edit[]) => {
  const src = readFileSync(file, "utf8")
  if (applied(src)) {
    log(`already applied: ${file}`)
    return
  }
  let out = src
  for (const { from, to } of edits) {
    if (!out.includes(from))
      throw new Error(
        `shadcn-customize: anchor not found in ${file}, shadcn output changed:\n${from}`,
      )
    out = out.replace(from, to)
  }
  writeFileSync(file, out)
  log(`patched: ${file}`)
}

// globals.css: brand font role (init repoints --font-sans at its own Inter variable).
patch("web/next/src/app/globals.css", (s) => s.includes("--font-sans: var(--font-dm-sans)"), [
  { from: "--font-sans: var(--font-sans);", to: "--font-sans: var(--font-dm-sans), sans-serif;" },
])

// button.tsx: Base UI render wiring (registry ships a plain native button).
patch("web/next/src/components/ui/button.tsx", (s) => s.includes("render={render}"), [
  {
    from: '  size = "default",\n  ...props\n}',
    to: '  size = "default",\n  render,\n  ...props\n}',
  },
  {
    from: "      className={cn(buttonVariants({ variant, size, className }))}\n      {...props}",
    to: "      className={cn(buttonVariants({ variant, size, className }))}\n      nativeButton={!render}\n      render={render}\n      {...props}",
  },
])

// spinner.tsx: type props off the Remixicon component (registry retypes to "svg").
patch("web/next/src/components/ui/spinner.tsx", (s) => s.includes("RemixiconComponentType"), [
  {
    from: 'import { RiLoaderLine } from "@remixicon/react"',
    to: 'import { RiLoaderLine, type RemixiconComponentType } from "@remixicon/react"',
  },
  { from: 'React.ComponentProps<"svg">', to: "React.ComponentProps<RemixiconComponentType>" },
])

// sidebar.tsx: SidebarTrigger gains an optional children label (the retired zeroui fork).
patch(
  "web/next/src/components/ui/sidebar.tsx",
  (s) => (s.match(/function SidebarTrigger\([\s\S]*?\n}/)?.[0] ?? "").includes("children"),
  [
    {
      from: "function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {",
      to: "function SidebarTrigger({ className, onClick, children, ...props }: React.ComponentProps<typeof Button>) {",
    },
    {
      from: '      <RiSideBarLine />\n      <span className="sr-only">Toggle Sidebar</span>',
      to: '      <RiSideBarLine />\n      {children}\n      <span className="sr-only">Toggle Sidebar</span>',
    },
  ],
)
