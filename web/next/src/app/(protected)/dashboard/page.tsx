import { PageHeader, PageShell } from "@/components/shell/content"

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
