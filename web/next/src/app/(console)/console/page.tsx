import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return (
    <PageShell>
      <PageHeader
        title="Console"
        description="Intentionally empty. Admin-gated; this is where your internal tooling begins."
      />
    </PageShell>
  )
}
