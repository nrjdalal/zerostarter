import { createFileRoute } from "@tanstack/react-router"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"

export const Route = createFileRoute("/(protected)/dashboard/")({
  component: Page,
})

function Page() {
  return (
    <DashboardShell>
      <DashboardHeader title="Dashboard" description="Welcome back." />
    </DashboardShell>
  )
}
