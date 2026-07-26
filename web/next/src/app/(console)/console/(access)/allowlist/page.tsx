import { ACCESS_ROLE } from "@packages/auth/access"
import { features } from "@packages/config/site"
import { notFound } from "next/navigation"

import { AllowlistDataTable } from "@/app/(console)/console/(access)/allowlist/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"
import { assertConsoleAccess } from "@/lib/auth/console"

// Access surfaces are an admin concern, and the console layout only guarantees member, so this page asserts its own rung. h-svh makes the shell definite so the table fills the viewport and scrolls internally.
export default async function Page() {
  await assertConsoleAccess(ACCESS_ROLE)
  if (!features.allowlist) notFound()
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Allowlist"
        description="Who gets into the console. Anyone can sign up and use the dashboard; a rule here lifts matching people to member on their next sign-in."
      />
      <AllowlistDataTable />
    </PageShell>
  )
}
