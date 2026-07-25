import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

// Without this Next serves its own bare document (<html id="__next_error__">), which renders outside the root layout: no theme class, no fonts, so every 404 flashes white before or instead of the app's own styling. This one renders inside the layout, so it is themed like the rest of the app.
export default function NotFound() {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          This page does not exist, or it moved. Check the address, or head back to the start.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link href="/" />}>
          Back home
        </Button>
      </EmptyContent>
    </Empty>
  )
}
