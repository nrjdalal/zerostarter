import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"

export default function Page() {
  return (
    <DashboardShell>
      <DashboardHeader
        title="Dashboard"
        description="Intentionally empty. Auth, orgs, and the API are wired; this page is where your product begins."
      />
    </DashboardShell>
  )
}
