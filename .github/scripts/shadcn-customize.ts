import { readFileSync, writeFileSync } from "node:fs"

const FILE = "web/next/src/components/ui/sidebar.tsx"
const src = readFileSync(FILE, "utf8")

const block = src.match(/function SidebarTrigger\([\s\S]*?\n}/)?.[0]
if (!block)
  throw new Error(
    "shadcn-customize: SidebarTrigger not found in ui/sidebar.tsx; shadcn output changed",
  )

if (block.includes("children")) process.exit(0) // already extended

// make the synced SidebarTrigger extensible: render an optional label via children; defaults and prop forwarding stay exactly as shadcn ships them
let out = block
const sub = (from: string, to: string) => {
  if (!out.includes(from))
    throw new Error(`shadcn-customize: pattern not found, transform aborted: ${from}`)
  out = out.replace(from, to)
}

sub("{ className, onClick, ...props }", "{ className, onClick, children, ...props }")
sub(
  '<span className="sr-only">Toggle Sidebar</span>',
  '{children}\n      <span className="sr-only">Toggle Sidebar</span>',
)

writeFileSync(FILE, src.replace(block, out))
