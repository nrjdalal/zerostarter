import { RiLockLine } from "@remixicon/react"

// An authored abstraction of the shipped shell, not a screenshot. Every route and gate below exists: /dashboard is auth-gated, /console and /console/docs are role-gated. Decorative for AT; the prose beside it carries the same facts.
const rows = [
  { label: "/dashboard", note: "session" },
  { label: "/console", note: "member+", gated: true },
  { label: "/console/docs", note: "member+", gated: true },
]

export function AppShellDiagram() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border bg-background font-mono text-xs text-muted-foreground select-none"
    >
      <div className="flex h-8 items-center gap-2 border-b px-3">
        <span className="size-1.5 rounded-full bg-foreground/70" />
        <span className="text-foreground/70">SidebarShell</span>
      </div>
      <div className="flex min-h-44">
        <div className="w-36 shrink-0 space-y-2 border-r p-3">
          <div className="rounded border border-dashed border-border px-2 py-1.5">OrgSwitcher</div>
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-1 pt-1">
              {row.gated && <RiLockLine className="size-2.5 shrink-0" />}
              <span className="truncate text-foreground/70">{row.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2.5 p-3">
          <div className="text-foreground/70">{"<PageHeader />"}</div>
          <div className="space-y-2 rounded border border-dashed border-border/70 p-2.5">
            <div className="h-1.5 w-2/3 rounded-full bg-foreground/10" />
            <div className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
            <div className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
          </div>
          <div className="text-foreground/50">your product logic</div>
        </div>
      </div>
    </div>
  )
}
