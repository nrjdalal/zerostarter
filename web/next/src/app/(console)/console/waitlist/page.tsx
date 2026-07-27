import { ACCESS_ROLE } from "@packages/auth/access"
import { features } from "@packages/config/site"
import { notFound } from "next/navigation"

import { WaitlistDataTable } from "@/app/(console)/console/waitlist/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"
import { assertConsoleAccess } from "@/lib/auth/console"

// h-svh makes the shell definite so the table fills the viewport and scrolls internally. The rung and why it is its own nav group are argued where the group is declared, in the console sidebar.
export default async function Page() {
  await assertConsoleAccess(ACCESS_ROLE)
  if (!features.waitlist) notFound()
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Signups"
        description="Who has asked to be told when this launches, newest first. Copy a selection to reach them, or remove a signup that should not be there."
      />
      <WaitlistDataTable />
    </PageShell>
  )
}
