import { ACCESS_ROLE } from "@packages/auth/access"

import { UsersDataTable } from "@/app/(console)/console/(access)/users/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"
import { assertConsoleAccess } from "@/lib/auth/console"

// Access surfaces are an admin concern, and the console layout only guarantees member, so this page asserts its own rung. It lists every account's email, which is not a member's business. h-svh makes the shell definite so the table's flex chain can fill the viewport and scroll internally.
export default async function Page() {
  await assertConsoleAccess(ACCESS_ROLE)
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Users"
        description="Everyone with an account, newest first. Search by name or email, filter by role, or sort by any column."
      />
      <UsersDataTable />
    </PageShell>
  )
}
