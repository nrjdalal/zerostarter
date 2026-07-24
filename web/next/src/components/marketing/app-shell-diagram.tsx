import { RiLockLine } from "@remixicon/react"

// An authored abstraction of the shipped app shell, not a screenshot: route names and gating are
// real, so it stays true when the UI is restyled. Decorative for AT; the prose beside it carries
// the same facts.
const nav = [
  { group: "Dashboard", items: ["Overview", "Organizations", "Teams", "Settings"] },
  { group: "Console", items: ["Users", "Sessions"], gated: true },
]

export function AppShellDiagram() {
  return (
    <div
      aria-hidden
      className="bg-background text-muted-foreground overflow-hidden rounded-lg border font-mono text-[10px] select-none"
    >
      <div className="flex h-8 items-center gap-2 border-b px-3">
        <span className="bg-foreground/70 size-1.5 rounded-full" />
        <span className="text-foreground/70">{"/dashboard"}</span>
        <span className="border-border ml-auto rounded border px-1.5 py-0.5">session</span>
      </div>
      <div className="flex min-h-44">
        <div className="w-32 shrink-0 space-y-3 border-r p-3">
          {nav.map((section) => (
            <div key={section.group} className="space-y-1.5">
              <div className="text-foreground/70 flex items-center gap-1">
                {section.group}
                {section.gated && <RiLockLine className="size-2.5" />}
              </div>
              {section.items.map((item) => (
                <div key={item} className="pl-2 leading-relaxed">
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-2.5 p-3">
          <div className="text-foreground/70">{"<PageHeader />"}</div>
          <div className="border-border/70 space-y-2 rounded border border-dashed p-2.5">
            <div className="bg-foreground/10 h-1.5 w-2/3 rounded-full" />
            <div className="bg-foreground/10 h-1.5 w-1/2 rounded-full" />
            <div className="bg-foreground/10 h-1.5 w-3/5 rounded-full" />
          </div>
          <div className="text-foreground/50">{"your product logic"}</div>
        </div>
      </div>
    </div>
  )
}
