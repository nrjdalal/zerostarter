import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return (
    <PageShell>
      <PageHeader
        title="Console"
        description="Intentionally minimal. Platform surfaces live in the sidebar; Users is the first."
      />
    </PageShell>
  )
}
