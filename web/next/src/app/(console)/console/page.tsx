import { ConsoleUsersTable } from "@/components/console/users-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"
import { assertConsoleAccess } from "@/lib/auth/console"

export default async function Page() {
  // The layout gates too, but layouts and pages render in parallel; a page exposing sensitive data must gate itself.
  await assertConsoleAccess()

  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Console"
        description="Every user on the platform: server-driven search, sort, and infinite scroll."
      />
      <ConsoleUsersTable />
    </PageShell>
  )
}
