import { ACCESS_ROLE } from "@packages/auth/access"

import { ActivityDataTable } from "@/app/(console)/console/activity/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"
import { assertConsoleAccess } from "@/lib/auth/console"

// Admin and above, like Access: this names who changed whose account, which is not a member's business. The console layout only guarantees member, so the page asserts its own rung.
export default async function Page() {
  await assertConsoleAccess(ACCESS_ROLE)
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Activity"
        description="Every change the console has made to who gets in, newest first. Nothing here is ever edited or removed."
      />
      <ActivityDataTable />
    </PageShell>
  )
}
