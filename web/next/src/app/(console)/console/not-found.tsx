import Link from "next/link"

import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

// Console-scoped not-found, so a page above the viewer's rung resolves inside the shell instead of swapping the whole document for the global 404 (which reads as the app flashing away). It covers notFound() thrown by a page under this segment. A viewer with no console access at all is refused by the layout instead, which throws above this boundary and so never reaches it.
export default function NotFound() {
  return (
    <PageShell size="lg" className="flex flex-1 flex-col justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Not found</EmptyTitle>
          <EmptyDescription>
            This page does not exist, or your role does not reach it. Ask an owner or admin if you
            think it should.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href="/console" />}>
            Back to the console
          </Button>
        </EmptyContent>
      </Empty>
    </PageShell>
  )
}
