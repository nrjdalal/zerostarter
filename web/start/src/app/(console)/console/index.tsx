import { createFileRoute } from "@tanstack/react-router"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"

export const Route = createFileRoute("/(console)/console/")({
  component: Page,
})

function Page() {
  return (
    <DashboardShell>
      <DashboardHeader title="Console" description="Welcome back." />
    </DashboardShell>
  )
}
