import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return (
    <PageShell>
      <PageHeader
        title="Console"
        description="Intentionally minimal. Admin surfaces live in the sidebar for admins and owners; a member sees the docs."
      />
    </PageShell>
  )
}
