"use client"

import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"

export function ApiStatus() {
  const { isLoading, isError } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { data, error } = await unwrap(apiClient.health.$get())
      if (error) throw new Error(error.message)
      return data
    },
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Badge
        variant="outline"
        role="status"
        aria-label="API status"
        className="invisible h-8 gap-2 rounded-full border px-4 py-1.5 text-sm"
      >
        <span className="size-2 shrink-0 rounded-full" />
        <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
      </Badge>
    )
  }

  if (isError) {
    return (
      <Badge
        variant="destructive"
        role="status"
        aria-label="API status"
        className="border-destructive/20 animate-in fade-in h-8 gap-2 rounded-full border px-4 py-1.5 text-sm duration-2000"
      >
        <span className="bg-destructive size-2 shrink-0 rounded-full" />
        <span className="min-w-48 text-center whitespace-nowrap">Systems are facing issues</span>
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label="API status"
      className="border-success/20 bg-success/10 text-success animate-in fade-in h-8 gap-2 rounded-full border px-4 py-1.5 text-sm duration-2000"
    >
      <span className="bg-success size-2 shrink-0 rounded-full" />
      <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
    </Badge>
  )
}
