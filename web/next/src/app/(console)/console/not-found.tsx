import { RouteNotFound } from "@/components/common/route-not-found"
import { PageShell } from "@/components/shell/page-shell"

// Console-scoped not-found, so a page above the viewer's rung resolves inside the shell instead of swapping the whole document for the global 404 (which reads as the app flashing away). It covers notFound() thrown by a page under this segment. A viewer with no console access at all is refused by the layout instead, which throws above this boundary and so never reaches it.
// No main landmark here: SidebarShell already renders one around this.
export default function NotFound() {
  return (
    <PageShell size="lg" className="flex flex-1 flex-col justify-center">
      <RouteNotFound
        action="Back to the console"
        description="This page does not exist, or your role does not reach it. Ask an owner or admin if you think it should."
        href="/console"
        title="Not found"
      />
    </PageShell>
  )
}
