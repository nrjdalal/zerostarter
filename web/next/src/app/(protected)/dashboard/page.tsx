import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description="Intentionally empty. Auth, orgs, and the API are wired; this page is where your product begins."
      />
    </PageShell>
  )
}
