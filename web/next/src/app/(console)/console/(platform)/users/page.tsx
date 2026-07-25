import { UsersDataTable } from "@/app/(console)/console/(platform)/users/components/data-table"
import { PageHeader } from "@/components/shell/page-header"
import { PageShell } from "@/components/shell/page-shell"

// No server gate here on purpose: the layout 404s non-admins, this page renders no data itself, and every row comes from the admin-gated API. Staying synchronous lets the shell paint instantly on navigation instead of suspending into the route spinner. h-svh makes the shell definite so the table's flex chain can fill the viewport and scroll internally.
export default function Page() {
  return (
    <PageShell size="lg" className="flex h-svh flex-col">
      <PageHeader
        title="Users"
        description="Everyone with an account, newest first. Search by name or email, filter by role, or sort by any column."
      />
      <UsersDataTable />
    </PageShell>
  )
}
