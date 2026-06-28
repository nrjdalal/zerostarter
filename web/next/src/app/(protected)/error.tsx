"use client"

import { RiRefreshLine } from "@remixicon/react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>An unexpected error occurred while loading this page.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => reset()}>
            <RiRefreshLine />
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
