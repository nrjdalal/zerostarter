import { features } from "@packages/config/site"
import { notFound } from "next/navigation"

import { AllowlistDataTable } from "@/app/(console)/console/(access)/allowlist/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

// No role gate here on purpose: the layout 404s anyone below member, the API gates both reading and writing, and staying synchronous lets the shell paint instantly. h-svh makes the shell definite so the table fills the viewport and scrolls internally.
export default function Page() {
  if (!features.allowlist) notFound()
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Allowlist"
        description="Who may create an account. With no rules, anyone can; add one and only matching addresses may join."
      />
      <AllowlistDataTable />
    </PageShell>
  )
}
