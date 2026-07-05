import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"

export default function Page() {
  return (
    <DashboardShell>
      <DashboardHeader title="Console" description="Welcome back." />
    </DashboardShell>
  )
}
