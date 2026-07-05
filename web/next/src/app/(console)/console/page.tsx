import { PageHeader } from "@/components/shell/content"
import { PageShell } from "@/components/shell/content"

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
