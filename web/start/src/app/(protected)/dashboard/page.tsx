import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"

export default function Page() {
  return (
    <DashboardShell>
      <DashboardHeader title="Dashboard" description="Welcome back." />
    </DashboardShell>
  )
}
