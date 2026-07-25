import { UsersDataTable } from "@/app/(console)/console/(platform)/users/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

// No server gate here on purpose: the layout 404s non-admins, this page renders no data itself, and every row comes from the admin-gated API. Staying synchronous lets the shell paint instantly on navigation instead of suspending into the route spinner.
export default function Page() {
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Users"
        description="Every user on the platform: server-driven search, sort, and infinite scroll."
      />
      <UsersDataTable />
    </PageShell>
  )
}
