"use client"

import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { apiClient, unwrap } from "@/lib/api/client"
import { cn } from "@/lib/utils"

const pillClassName = "h-8 gap-2 rounded-full border px-4 py-1.5 text-sm"

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
        className={cn(pillClassName, "invisible")}
      >
        <div className="size-2 shrink-0 rounded-full" />
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
        className={cn(pillClassName, "border-destructive/20 animate-in fade-in duration-2000")}
      >
        <div className="bg-destructive size-2 shrink-0 rounded-full" />
        <span className="min-w-48 text-center whitespace-nowrap">Systems are facing issues</span>
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      role="status"
      aria-label="API status"
      className={cn(
        pillClassName,
        "border-success/20 bg-success/10 text-success animate-in fade-in duration-2000",
      )}
    >
      <div className="bg-success size-2 shrink-0 rounded-full" />
      <span className="min-w-48 text-center whitespace-nowrap">All systems are operational</span>
    </Badge>
  )
}
